@echo off
echo Generando un nuevo token para admin@example.com...
echo.

set EMAIL=admin@example.com
set PASSWORD=admin123

echo Intentando login...
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"%EMAIL%\",\"password\":\"%PASSWORD%\"}" http://localhost:5001/api/users/login > login-response.json

echo.
echo Respuesta de login guardada en login-response.json
echo.

echo Extrayendo token...
for /f "tokens=*" %%a in ('type login-response.json ^| findstr /C:"token"') do set TOKEN_LINE=%%a
set TOKEN=%TOKEN_LINE:"token":"=%
set TOKEN=%TOKEN:",=%
set TOKEN=%TOKEN:"success":true}=%

echo Token extraído: %TOKEN%
echo %TOKEN% > token.txt
echo Token guardado en token.txt
echo.

echo Probando endpoint de perfil...
curl -H "Authorization: Bearer %TOKEN%" http://localhost:5001/api/users/profile > profile-response.json

echo.
echo Respuesta del perfil guardada en profile-response.json
echo.
echo Mostrando respuesta:
type profile-response.json

echo.
echo PRUEBA COMPLETA - Verifica los archivos JSON generados para más detalles
pause
