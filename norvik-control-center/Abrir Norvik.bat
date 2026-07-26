@echo off
title Norvik Control Center
cd /d "%~dp0"

echo.
echo  ==========================================
echo    NORVIK CONTROL CENTER
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto sin_node

if not exist "node_modules" goto instalar
goto comprobar_base

:instalar
echo  Primera vez: instalando la aplicacion.
echo  Tarda entre 2 y 5 minutos. No cierres esta ventana.
echo.
call npm install
if errorlevel 1 goto error

:comprobar_base
if exist "prisma\dev.db" goto arrancar
echo.
echo  Creando la base de datos y cargando el checklist...
echo.
call npx prisma migrate dev --name init
if errorlevel 1 goto error

:arrancar
echo.
echo  Arrancando. El navegador se abrira solo en unos segundos.
echo.
echo  Direccion:  http://localhost:3000
echo.
echo  PARA CERRAR LA APP: cierra esta ventana negra.
echo.
start "" /min "%~dp0_abrir-navegador.bat"
call npm run dev
goto fin

:sin_node
echo  Te falta instalar Node.js, que es lo que hace funcionar la app.
echo.
echo  1. Entra en  https://nodejs.org
echo  2. Descarga el boton grande que pone LTS
echo  3. Instalalo dando a Siguiente hasta el final
echo  4. Vuelve a hacer doble clic en este archivo
echo.
pause
exit /b 1

:error
echo.
echo  ------------------------------------------
echo   Algo ha fallado.
echo   Copia el texto de arriba y enviaselo a Claude.
echo  ------------------------------------------
echo.
pause
exit /b 1

:fin
echo.
echo  La aplicacion se ha detenido.
pause
