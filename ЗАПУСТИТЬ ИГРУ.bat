@echo off
chcp 65001 > nul
title Спаси Больного!
echo.
echo  ==============================================
echo   СПАСИ БОЛЬНОГО! - Скорая Помощь
echo  ==============================================
echo.
echo   Поднимаю локальный сервер...
echo   Браузер откроется сам. Не закрывайте это окно,
echo   пока играете.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
