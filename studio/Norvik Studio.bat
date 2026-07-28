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
REM
REM  Checking that the node_modules FOLDER exists is not enough, and getting
REM  this wrong cost a real user a confusing failure: a half-finished npm
REM  install leaves the folder behind, so the launcher skipped installing and
REM  the app then died on a missing package. What is checked instead is that
REM  the packages the app actually needs are present.
if not exist "node_modules\next" goto :deps_missing
if not exist "node_modules\@libsql\client" goto :deps_missing
if not exist "node_modules\drizzle-orm" goto :deps_missing
echo   [2/4] Dependencias ya instaladas.
goto :deps_done

:deps_missing
echo   [2/4] Instalando lo que necesita la aplicacion.
echo         Tarda un par de minutos. Solo pasa la primera vez.
echo.
call npm install
if errorlevel 1 goto :install_failed
if not exist "node_modules\next" goto :install_incomplete
echo.

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

REM --- Step 3b: database ------------------------------------------------------
REM  Run it here rather than leaving it to `predev`, so a failure is reported
REM  with an explanation instead of scrolling past inside the dev server's own
REM  output.
call npm run setup
if errorlevel 1 goto :setup_retry
goto :setup_ok

:setup_retry
echo.
echo   Algo falta. Reinstalando y reintentando una vez.
echo.
call npm install
if errorlevel 1 goto :install_failed
call npm run setup
if errorlevel 1 goto :setup_failed

:setup_ok

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

:install_incomplete
echo.
echo   LA INSTALACION HA QUEDADO A MEDIAS
echo.
echo   Se han descargado algunos paquetes pero no todos. Casi siempre es la
echo   conexion. Borra la carpeta "node_modules" y vuelve a hacer doble clic
echo   aqui para empezar de cero.
echo.
pause
exit /b 1

:setup_failed
echo.
echo   NO SE HA PODIDO PREPARAR LA BASE DE DATOS
echo.
echo   Copia el texto de mas arriba y pegamelo, y lo miro.
echo.
pause
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
