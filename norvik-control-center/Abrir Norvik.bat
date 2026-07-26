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
if exist "prisma\dev.db" goto sembrar
echo.
echo  Creando la base de datos...
echo.
call npx prisma migrate dev --name init
if errorlevel 1 goto error

:sembrar
rem Carga el checklist si aun no esta. Si ya esta, no duplica nada.
echo  Comprobando el checklist...
call npx prisma db seed
if errorlevel 1 goto error

:acceso_directo
rem Crea el icono en el Escritorio la primera vez.
set "CARPETA=%~dp0"
for /f "usebackq delims=" %%E in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"`) do set "ESCRITORIO=%%E"
if not defined ESCRITORIO set "ESCRITORIO=%USERPROFILE%\Desktop"
set "ACCESO=%ESCRITORIO%\Norvik Control Center.lnk"
if exist "%ACCESO%" goto arrancar
powershell -NoProfile -Command "try { $s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:ACCESO); $s.TargetPath = $env:CARPETA + 'Abrir Norvik.bat'; $s.WorkingDirectory = $env:CARPETA; $s.Description = 'Norvik Control Center'; $s.Save() } catch { }"
if exist "%ACCESO%" echo  Te he dejado un acceso directo en el Escritorio.

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
