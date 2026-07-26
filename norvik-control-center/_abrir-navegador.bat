@echo off
rem Espera a que el servidor responda y abre el navegador.
rem Lo lanza "Abrir Norvik.bat"; no hace falta ejecutarlo a mano.
setlocal
set /a intentos=0

:esperar
set /a intentos+=1
if %intentos% gtr 90 goto abrir
curl -s -o nul http://localhost:3000
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto esperar
)

:abrir
start "" http://localhost:3000
exit /b
