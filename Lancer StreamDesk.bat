@echo off
setlocal enabledelayedexpansion
title StreamDesk
cd /d "%~dp0"

echo ============================================
echo   StreamDesk - Demarrage
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
    echo Installez Node.js 20 LTS depuis https://nodejs.org/ puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js detecte : %%v

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

if not exist "node_modules" (
    echo.
    echo Premiere installation des dependances, cela peut prendre plusieurs minutes...
    echo.
    call pnpm install
    if errorlevel 1 (
        echo.
        echo [ERREUR] "pnpm install" a echoue. Voir le message ci-dessus.
        pause
        exit /b 1
    )
) else (
    echo Dependances deja installees.
    echo (Pour forcer une reinstallation : supprimez le dossier node_modules)
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
