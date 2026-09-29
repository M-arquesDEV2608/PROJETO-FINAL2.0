@echo off
cd /d "%~dp0"
echo ========================================
echo        FIXTRACK - PAINEL WEB
echo ========================================
echo.
echo Iniciando servidor...
echo Depois abra: http://localhost:3000
node server.js
pause
