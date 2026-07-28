@echo off
chcp 65001 >nul 2>nul
title Norvik Sourcing Studio

REM ---------------------------------------------------------------------------
REM  Norvik Sourcing Studio - launcher for Windows.
REM
REM  Double-click this file. It prepares everything that is missing and opens
REM  the app in the browser. There is nothing to type.
REM
REM  Deliberately boring: every step checks whether it is needed and says what
REM  it is doing, so a failure names the step it failed at instead of closing
REM  the window on an unread error.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

echo.
echo   NORVIK SOURCING STUDIO
echo   ======================
echo.

REM --- Step 1: is Node.js installed? -----------------------------------------
where node >nul 2>nul
if errorlevel 1 goto :no_node

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo   [1/4] Node.js %NODE_VERSION% detectado.

REM --- Step 2: dependencies --------------------------------------------------
if exist "node_modules" goto :deps_ready
echo   [2/4] Primera vez: instalando lo que necesita la aplicacion.
echo         Esto tarda un par de minutos. Solo pasa una vez.
echo.
call npm install
if errorlevel 1 goto :install_failed
goto :deps_done

:deps_ready
echo   [2/4] Dependencias ya instaladas.

:deps_done

REM --- Step 3: configuration -------------------------------------------------
if exist ".env" goto :env_ready

echo   [3/4] Falta tu archivo de configuracion. Lo creo y lo abro.
copy ".env.example" ".env" >nul
echo.
echo         Se va a abrir el Bloc de notas.
echo         Busca la linea que empieza por SHOPIFY_ADMIN_TOKEN y pega tu token
echo         de Shopify entre las comillas. Luego guarda (Ctrl+S) y cierra la
echo         ventana del Bloc de notas para continuar.
echo.
pause
start /wait notepad ".env"
goto :env_done

:env_ready
echo   [3/4] Configuracion encontrada.

:env_done

REM --- Step 4: start ---------------------------------------------------------
echo   [4/4] Arrancando. El navegador se abrira solo en unos segundos.
echo.
echo   ---------------------------------------------------------------
echo    Para CERRAR la aplicacion: cierra esta ventana negra.
echo    Mientras este abierta, la aplicacion esta funcionando.
echo   ---------------------------------------------------------------
echo.

start "" cmd /c "timeout /t 12 /nobreak >nul & start "" http://localhost:4321"
call npm run dev

echo.
echo   La aplicacion se ha detenido.
pause
exit /b 0

REM ---------------------------------------------------------------------------

:no_node
echo   FALTA UN PASO PREVIO
echo.
echo   Node.js no esta instalado en este ordenador. Es el motor que necesita
echo   la aplicacion para funcionar. Se instala una sola vez.
echo.
echo   Voy a abrir la pagina de descarga. Descarga la version marcada como LTS,
echo   ejecuta el instalador y acepta todas las opciones por defecto.
echo.
echo   Cuando termine, cierra esta ventana y vuelve a hacer doble clic aqui.
echo.
pause
start "" https://nodejs.org/es/download
exit /b 1

:install_failed
echo.
echo   LA INSTALACION HA FALLADO
echo.
echo   Lo mas habitual es que sea un problema de conexion a internet.
echo   Comprueba que tienes conexion y vuelve a hacer doble clic aqui.
echo.
echo   Si vuelve a fallar, copia el texto rojo de mas arriba y pegamelo.
echo.
pause
exit /b 1
