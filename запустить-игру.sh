#!/bin/sh
# Спаси Больного! — локальный сервер для macOS / Linux
cd "$(dirname "$0")" || exit 1

if [ ! -f dist/index.html ]; then
  echo "ОШИБКА: папка dist с собранной игрой не найдена."
  echo "Соберите игру: npm install, затем npm run build."
  exit 1
fi

PORT=8765
URL="http://localhost:$PORT"
echo "Игра запущена: $URL"
echo "(Ctrl+C в этом окне остановит сервер)"

( sleep 1
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  fi ) &

cd dist || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT" 2>/dev/null || exec python -m SimpleHTTPServer "$PORT"
else
  echo "python3 не найден. Запустите любой статический сервер в папке dist, например: npx serve dist"
  exit 1
fi
