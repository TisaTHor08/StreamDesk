@echo off
setlocal enabledelayedexpansion
title StreamDesk
cd /d "%~dp0"

set "REQUIRED_NODE_MAJOR=22"
set "PORTABLE_NODE_DIR=%~dp0.tools\node"
set "NODE_BIN="

echo ============================================
echo   StreamDesk - Demarrage
echo ============================================
echo.

rem --- 1. Reutiliser une version portable deja telechargee, si elle correspond ---
if exist "%PORTABLE_NODE_DIR%\node.exe" (
    for /f "tokens=*" %%v in ('"%PORTABLE_NODE_DIR%\node.exe" -v') do set "PORTABLE_VER=%%v"
    set "PORTABLE_VER=!PORTABLE_VER:v=!"
    for /f "delims=." %%m in ("!PORTABLE_VER!") do set "PORTABLE_MAJOR=%%m"
    if "!PORTABLE_MAJOR!"=="%REQUIRED_NODE_MAJOR%" set "NODE_BIN=%PORTABLE_NODE_DIR%"
)

rem --- 2. Sinon, utiliser le Node.js du systeme s'il a la bonne version majeure ---
if not defined NODE_BIN (
    where node >nul 2>nul
    if not errorlevel 1 (
        for /f "tokens=*" %%v in ('node -v') do set "SYS_VER=%%v"
        set "SYS_VER=!SYS_VER:v=!"
        for /f "delims=." %%m in ("!SYS_VER!") do set "SYS_MAJOR=%%m"
        if "!SYS_MAJOR!"=="%REQUIRED_NODE_MAJOR%" (
            for /f "delims=" %%I in ('where node') do if not defined NODE_BIN set "NODE_BIN=%%~dpI"
        )
    )
)

rem --- 3. Sinon, telecharger automatiquement une version portable (pas d'admin requis) ---
if not defined NODE_BIN (
    where node >nul 2>nul
    if not errorlevel 1 (
        for /f "tokens=*" %%v in ('node -v') do echo Node.js detecte sur ce PC : %%v ^(version %REQUIRED_NODE_MAJOR% requise pour StreamDesk^)
    ) else (
        echo Aucun Node.js detecte sur ce PC.
    )

    where powershell >nul 2>nul
    if errorlevel 1 (
        echo [ERREUR] PowerShell est introuvable, impossible d'installer Node.js automatiquement.
        echo Installez manuellement Node.js %REQUIRED_NODE_MAJOR% LTS depuis https://nodejs.org/
        pause
        exit /b 1
    )

    echo.
    echo Installation automatique de Node.js %REQUIRED_NODE_MAJOR% LTS ^(portable, dans .tools\node ; n'affecte pas votre installation existante^)...
    echo Cela telecharge environ 30 Mo depuis nodejs.org...
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deployments\windows\install-node-portable.ps1" -Major %REQUIRED_NODE_MAJOR% -DestDir "%PORTABLE_NODE_DIR%"
    if errorlevel 1 (
        echo.
        echo [ERREUR] Le telechargement automatique de Node.js a echoue ^(pas d'acces internet ?^).
        echo Installez manuellement Node.js %REQUIRED_NODE_MAJOR% LTS depuis https://nodejs.org/ puis relancez ce fichier.
        pause
        exit /b 1
    )
    if exist "%PORTABLE_NODE_DIR%\node.exe" set "NODE_BIN=%PORTABLE_NODE_DIR%"
)

if not defined NODE_BIN (
    echo [ERREUR] Impossible d'obtenir Node.js %REQUIRED_NODE_MAJOR%.
    pause
    exit /b 1
)

set "PATH=%NODE_BIN%;%PATH%"
for /f "tokens=*" %%v in ('node -v') do echo Node.js utilise : %%v ^(%NODE_BIN%^)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm n'est pas installe. Installation via npm...
    call npm install -g pnpm
    if errorlevel 1 (
        echo.
        echo [ERREUR] "npm install -g pnpm" a echoue. Voir le message ci-dessus.
        pause
        exit /b 1
    )
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERREUR] pnpm vient d'etre installe mais n'est pas trouve dans le PATH de cette fenetre.
    echo Fermez cette fenetre, rouvrez "Lancer StreamDesk.bat" une seconde fois, cela suffit generalement.
    pause
    exit /b 1
)

if not exist "node_modules\.bin\tsc.cmd" (
    echo.
    echo Installation des dependances, cela peut prendre plusieurs minutes...
    echo ^(le dossier node_modules existe peut-etre deja mais est incomplet : c'est normal apres une premiere tentative interrompue^)
    echo.
    call pnpm install
    if errorlevel 1 (
        echo.
        echo [ERREUR] "pnpm install" a echoue. Voir le message ci-dessus.
        pause
        exit /b 1
    )
    if not exist "node_modules\.bin\tsc.cmd" (
        echo.
        echo [ERREUR] "pnpm install" s'est termine sans erreur mais node_modules\.bin\tsc.cmd est toujours absent.
        echo Supprimez le dossier node_modules puis relancez ce fichier.
        pause
        exit /b 1
    )
) else (
    echo Dependances deja installees.
    echo ^(Pour forcer une reinstallation complete : supprimez le dossier node_modules^)
)

echo.
echo ============================================
echo   Lancement : Serveur + Connect + Interface
echo ============================================
echo.
echo   Interface (Deck)   : http://localhost:5173
echo   Administration     : http://localhost:5173/admin
echo   API Serveur        : http://localhost:8080
echo.
echo Laissez cette fenetre ouverte tant que vous utilisez StreamDesk.
echo Fermez-la (ou Ctrl+C) pour tout arreter.
echo.

start "" cmd /c "timeout /t 10 >nul && start http://localhost:5173/admin"

call pnpm dev

echo.
echo StreamDesk s'est arrete.
pause
