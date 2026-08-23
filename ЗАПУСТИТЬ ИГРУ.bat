@echo off
rem ============================================================
rem  Save the Patient! (Spasi Bolnogo) - local game launcher
rem  This file is ASCII-only on purpose: Windows reads .bat
rem  files in the OEM codepage, and any non-ASCII text here
rem  would corrupt the commands on some systems.
rem ============================================================
chcp 65001 >nul 2>&1
title Save the Patient! - Local Server
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if errorlevel 1 (
    echo.
    echo Launcher failed. Try right-click serve.ps1 and choose
    echo "Run with PowerShell", or open a terminal in this folder
    echo and execute: powershell -ExecutionPolicy Bypass -File serve.ps1
    pause
)
