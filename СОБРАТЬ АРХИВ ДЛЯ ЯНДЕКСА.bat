@echo off
rem ============================================================
rem  Builds the upload archive for Yandex Games:
rem  zips CONTENTS of dist/ and verifies exactly one index.html.
rem  ASCII-only on purpose: cmd reads .bat in OEM codepage, and
rem  non-ASCII text inside would corrupt the commands.
rem ============================================================
chcp 65001 >nul 2>&1
title Yandex Games archive builder
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack-yandex.ps1"
if errorlevel 1 (
    echo.
    echo Archiver failed. You can also run pack-yandex.ps1 manually:
    echo right-click the file, then "Run with PowerShell".
    pause
)
