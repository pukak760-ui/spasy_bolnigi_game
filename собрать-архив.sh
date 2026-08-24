#!/bin/sh
# Собирает архив для загрузки в Яндекс Игры из содержимого dist/
# и проверяет его ПОФАЙЛОВО: ровно один index.html в корне +
# каждый файл, на который ссылается index.html, обязан быть в ZIP.
cd "$(dirname "$0")" || exit 1

if [ ! -f dist/index.html ]; then
  echo "ОШИБКА: нет dist/index.html — сначала соберите игру: npm install && npm run build"
  exit 1
fi

echo "  Дата сборки: $(date -r dist/index.html '+%Y-%m-%d %H:%M:%S' 2>/dev/null || stat -c %y dist/index.html 2>/dev/null || echo 'n/a')"

# предполётная проверка маркеров свежести
for marker in scheduleReady boot-splash "environment.i18n.lang" "./assets/"; do
  if ! grep -q "$marker" dist/index.html; then
    echo "ОШИБКА: dist/index.html УСТАРЕЛ (нет маркера: $marker). Сначала: npm run build"
    exit 1
  fi
done
if grep -q 'src="/assets/\|href="/assets/' dist/index.html; then
  echo "ОШИБКА: абсолютные пути /assets/ — в vite.config.js должно быть base: './'"
  exit 1
fi
echo "  Проверка сборки: OK (фиксы на месте, пути относительные)"

rm -f spasi-bolnogo-yandex.zip

if command -v zip >/dev/null 2>&1; then
  (cd dist && zip -r -9 -X -q ../spasi-bolnogo-yandex.zip . -x '*.DS_Store' -x 'Thumbs.db')
else
  (cd dist && python3 - <<'PY'
import os, zipfile
with zipfile.ZipFile('../spasi-bolnogo-yandex.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk('.'):
        for f in files:
            if f in ('.DS_Store', 'Thumbs.db'):
                continue
            p = os.path.join(root, f)
            zf.write(p, os.path.relpath(p, '.').replace(os.sep, '/'))
PY
)
fi

# пофайловая валидация (та же логика, что у модерации Яндекса, + ссылки из index.html)
python3 - <<'PY'
import re, sys, zipfile

zf = zipfile.ZipFile('spasi-bolnogo-yandex.zip')
names = set(zf.namelist())
files = [n for n in names if not n.endswith('/')]

root_index = sum(1 for n in names if n == 'index.html')
any_index = sum(1 for n in names if n.rstrip('/').split('/')[-1] == 'index.html')
assets = [n for n in names if n.startswith('assets/')]

print(f"  Файлов в архиве: {len(files)} (в assets/: {len(assets)})")
print(f"  index.html: {root_index} в корне, {any_index} всего")

errors = []
if root_index != 1 or any_index != 1:
    errors.append("в архиве должен быть РОВНО ОДИН index.html и в КОРНЕ")
if len(assets) < 2:
    errors.append("в архиве нет папки assets/ с JS/CSS бандлами")

html = open('dist/index.html', encoding='utf-8').read()
refs = set(re.findall(r'\./assets/([A-Za-z0-9._-]+)', html))
refs = {'assets/' + r for r in refs}
refs |= set(re.findall(r'href="\./([A-Za-z0-9._-]+)"', html))
missing = sorted(r for r in refs if r not in names)
if missing:
    errors.append("index.html ссылается на файлы, которых НЕТ в архиве: " + ', '.join(missing))

# внешних ссылок на сервисные хранилища/CDN быть не должно (шрифты, картинки — только свои)
import glob
external = re.findall(r'(?:src|href)=["\']https?://[^"\']+', html)
for css in glob.glob('dist/assets/*.css'):
    text = open(css, encoding='utf-8').read()
    external += re.findall(r'url\(\s*["\']?https?://[^)"\']+|@import\s+[^;]*https?://[^;]+', text)
if external:
    errors.append("в сборке ВНЕШНИЕ ссылки (запрещено модерацией): " + ', '.join(external[:5]))

if errors:
    print()
    for e in errors:
        print("ОШИБКА: " + e)
    print("Пересоберите (npm run build) и запустите скрипт заново. Вручную ZIP не собирать!")
    sys.exit(1)

print()
print("  OK! Все файлы из index.html на месте в архиве.")
PY

if [ $? -ne 0 ]; then
  rm -f spasi-bolnogo-yandex.zip
  exit 1
fi

echo "  Загружайте в консоль Яндекс Игр файл:"
echo "  $(pwd)/spasi-bolnogo-yandex.zip"
echo ""
