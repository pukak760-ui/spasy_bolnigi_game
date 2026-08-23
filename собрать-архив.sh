#!/bin/sh
# Собирает архив для загрузки в Яндекс Игры из содержимого dist/
# и проверяет, что внутри ровно один index.html (в корне).
cd "$(dirname "$0")" || exit 1

if [ ! -f dist/index.html ]; then
  echo "ОШИБКА: нет dist/index.html — сначала соберите игру: npm install && npm run build"
  exit 1
fi

rm -f spasi-bolnogo-yandex.zip

if command -v zip >/dev/null 2>&1; then
  (cd dist && zip -r -9 -X ../spasi-bolnogo-yandex.zip . -x '*.DS_Store' >/dev/null)
else
  # запасной вариант через python3 (есть в macOS и большинстве Linux)
  (cd dist && python3 - <<'PY'
import os, zipfile
with zipfile.ZipFile('../spasi-bolnogo-yandex.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk('.'):
        for f in files:
            p = os.path.join(root, f)
            zf.write(p, os.path.relpath(p, '.'))
PY
)
fi

COUNT=$(python3 - <<'PY'
import zipfile
zf = zipfile.ZipFile('spasi-bolnogo-yandex.zip')
print(sum(1 for n in zf.namelist() if n.split('/')[-1] == 'index.html'))
PY
)

if [ "$COUNT" != "1" ]; then
  echo "ОШИБКА: в архиве $COUNT файлов index.html (должен быть ровно 1). Загрузка отклонена бы Яндексом."
  exit 1
fi

echo ""
echo "  ГОТОВО! Загружайте в консоль Яндекс Игр файл:"
echo "  $(pwd)/spasi-bolnogo-yandex.zip"
echo ""
