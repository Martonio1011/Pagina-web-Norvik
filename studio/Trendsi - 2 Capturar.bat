@echo off
chcp 65001 >nul 2>nul
title Capturar de Trendsi

REM ---------------------------------------------------------------------------
REM  Step 2 of the Trendsi setup: record what Trendsi actually returns.
REM
REM  Runs a handful of short searches with the saved session and saves the raw
REM  responses, with personal fields already stripped, into fixtures/trendsi.
REM  Those recordings are what the parser gets written against.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

echo.
echo   CAPTURAR DE TRENDSI
echo   ===================
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "node_modules\next" goto :not_installed

if not exist ".trendsi-session" goto :no_session

call npm run trendsi:capture

echo.
echo   Abriendo la carpeta con lo capturado...
if exist "fixtures\trendsi" start "" explorer "%~dp0fixtures\trendsi"

echo.
pause
exit /b 0

REM ---------------------------------------------------------------------------

:no_node
echo   Node.js no esta instalado todavia.
echo   Haz primero doble clic en "Norvik Studio.bat".
echo.
pause
exit /b 1

:not_installed
echo   La aplicacion todavia no esta preparada.
echo   Haz primero doble clic en "Norvik Studio.bat" y espera a que termine.
echo.
pause
exit /b 1

:no_session
echo   Todavia no has conectado con Trendsi.
echo.
echo   Haz primero doble clic en "Trendsi - 1 Conectar.bat" y entra con tu
echo   email y contrasena. Luego vuelve aqui.
echo.
pause
exit /b 1
