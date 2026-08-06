@echo off
cd /d "%~dp0"

echo ====================================================
echo   GERACAO DOS APKs - U^&M LUBETRACK
echo   Pasta: %CD%
echo ====================================================
echo.

echo [1/3] Verificando Node.js e NPM...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Node.js / NPM nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo  OK - NPM encontrado.

echo.
echo [2/3] Verificando estrutura do projeto Android...
if not exist "android\app\build.gradle" (
    echo.
    echo [ERRO] Pasta 'android' nao encontrada!
    echo Execute primeiro: npx cap add android
    echo.
    pause
    exit /b 1
)
echo  OK - Projeto Android encontrado.

echo.
echo [3/3] Iniciando geracao dos APKs...
echo.
node gerar_apks.js

if %errorlevel% neq 0 (
    echo.
    echo ====================================================
    echo   [ERRO] Falha na geracao dos APKs.
    echo   Verifique as mensagens de erro acima.
    echo ====================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo   SUCESSO! APKs gerados na pasta do projeto:
echo   - U^&M_Campo.apk
echo   - U^&M_PCM.apk
echo   - U^&M_Almoxarifado.apk
echo ====================================================
echo.
pause
