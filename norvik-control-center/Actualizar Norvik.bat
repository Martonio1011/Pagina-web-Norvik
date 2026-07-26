@echo off
title Actualizar Norvik Control Center
cd /d "%~dp0"

set "ZIP_URL=https://github.com/Martonio1011/Pagina-web-Norvik/archive/refs/heads/claude/norvik-control-center-lmfq1k.zip"
set "TMP_ZIP=%TEMP%\norvik-actualizacion.zip"
set "TMP_DIR=%TEMP%\norvik-actualizacion"

echo.
echo  ==========================================
echo    ACTUALIZAR NORVIK CONTROL CENTER
echo  ==========================================
echo.
echo  Descarga la ultima version y reemplaza los archivos.
echo  Tus datos NO se tocan.
echo.

curl -s -o nul --max-time 3 http://localhost:3000
if not errorlevel 1 goto app_abierta

echo  Descargando...
powershell -NoProfile -Command "try { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri $env:ZIP_URL -OutFile $env:TMP_ZIP -UseBasicParsing } catch { exit 1 }"
if errorlevel 1 goto error_red

echo  Descomprimiendo...
powershell -NoProfile -Command "try { if (Test-Path -LiteralPath $env:TMP_DIR) { Remove-Item -LiteralPath $env:TMP_DIR -Recurse -Force }; Expand-Archive -LiteralPath $env:TMP_ZIP -DestinationPath $env:TMP_DIR -Force } catch { exit 1 }"
if errorlevel 1 goto error_red

set "ORIGEN="
for /d %%D in ("%TMP_DIR%\*") do if exist "%%D\norvik-control-center\package.json" set "ORIGEN=%%D\norvik-control-center"
if not defined ORIGEN goto error_red

echo  Reemplazando archivos...
rem /XF dev.db protege la base de datos con tus tareas y pedidos.
robocopy "%ORIGEN%" "%CD%" /E /XF dev.db /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto error_copia

del "%TMP_ZIP%" >nul 2>nul
rmdir /s /q "%TMP_DIR%" >nul 2>nul

echo.
echo  Listo. Ya tienes la ultima version.
echo  Abre la app con "Abrir Norvik".
echo.
pause
exit /b 0

:app_abierta
echo  Norvik esta abierto ahora mismo.
echo.
echo  Cierra la ventana negra de la app y vuelve a ejecutar esta
echo  actualizacion. No se puede actualizar mientras esta en marcha.
echo.
pause
exit /b 1

:error_red
echo.
echo  No se ha podido descargar la actualizacion.
echo  Comprueba que tienes internet y vuelve a intentarlo.
echo.
pause
exit /b 1

:error_copia
echo.
echo  No se han podido reemplazar los archivos.
echo  Cierra cualquier ventana que use esta carpeta y reintentalo.
echo.
pause
exit /b 1
