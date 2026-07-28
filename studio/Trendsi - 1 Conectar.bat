@echo off
chcp 65001 >nul 2>nul
title Conectar con Trendsi

REM ---------------------------------------------------------------------------
REM  Step 1 of the Trendsi setup: log in once, by hand.
REM
REM  Opens a real Chrome window at Trendsi's login page and waits. The password
REM  is typed by the person, into that window, and never passes through this
REM  application.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

echo.
echo   CONECTAR CON TRENDSI
echo   ====================
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "node_modules\next" goto :not_installed

REM The browser Playwright drives is downloaded once, separately from npm.
if exist ".playwright-ready" goto :browser_ready
echo   Preparando el navegador. Solo pasa la primera vez, tarda un poco.
echo.
call npx playwright install chromium
if errorlevel 1 goto :browser_failed
echo ok> .playwright-ready
echo.

:browser_ready

call npm run trendsi:login

echo.
pause
exit /b 0

REM ---------------------------------------------------------------------------

:no_node
echo   Node.js no esta instalado todavia.
echo.
echo   Haz primero doble clic en "Norvik Studio.bat", que te guia para
echo   instalarlo. Luego vuelve aqui.
echo.
pause
exit /b 1

:not_installed
echo   La aplicacion todavia no esta preparada.
echo.
echo   Haz primero doble clic en "Norvik Studio.bat" y espera a que termine.
echo   Luego vuelve aqui.
echo.
pause
exit /b 1

:browser_failed
echo.
echo   No se ha podido descargar el navegador.
echo   Lo mas habitual es un problema de conexion. Comprueba internet y
echo   vuelve a intentarlo.
echo.
pause
exit /b 1
