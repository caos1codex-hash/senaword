@echo off
REM =====================================================================
REM  SENAWORD - Descarga, instala y abre con UN SOLO CLIC
REM ---------------------------------------------------------------------
REM  Comparte SOLAMENTE este archivo. Quien lo reciba solo debe:
REM    1. Guardarlo donde quiera (Descargas, Escritorio, USB...).
REM    2. Doble clic.
REM
REM  El script hace todo lo demas:
REM    1. Descarga el proyecto completo (~474 MB, solo la primera vez)
REM       desde GitHub a una carpeta SENAWORD al lado de este archivo.
REM    2. Lo descomprime (incluye codigo + dependencias offline).
REM    3. Instala Node.js si falta, instala dependencias, crea la base
REM       de datos y abre la app en el navegador.
REM
REM  Si se ejecuta de nuevo y la carpeta ya existe, NO descarga otra
REM  vez: inicia la app directamente.
REM =====================================================================
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title SENAWORD - Descarga e instalacion con un clic
cd /d "%~dp0"

set "ZIP_URL=https://github.com/caos1codex-hash/senaword/releases/download/portable-v1/SENAWORD-portable-v1.zip"
set "BASE=%~dp0SENAWORD"
set "APP=!BASE!\senaword"
set "ZIP=!BASE!\SENAWORD-portable-v1.zip"

echo.
echo  ================================================
echo   SENAWORD - Instalacion con un clic
echo  ================================================
echo.

if exist "!APP!\package.json" (
    echo  [1/2] Proyecto ya descargado. Iniciando...
    echo.
    goto :instalar
)

echo  [1/2] Descargando SENAWORD (~474 MB, solo la primera vez)...
echo        Destino: !BASE!
echo.
if not exist "!BASE!\" mkdir "!BASE!"

where curl.exe >nul 2>nul
if !errorlevel! equ 0 (
    curl.exe -fL -o "!ZIP!" "!ZIP_URL!"
) else (
    echo  curl no encontrado. Descargando con PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '!ZIP_URL!' -OutFile '!ZIP!'"
)
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: No se pudo descargar el proyecto.
    echo  Revisa tu internet y vuelve a dar doble clic.
    echo.
    pause
    exit /b 1
)

echo.
echo  Descomprimiendo (tarda 1-3 minutos)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '!ZIP!' -DestinationPath '!BASE!' -Force"
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: No se pudo descomprimir el ZIP.
    echo  Borra la carpeta "!BASE!" y reintenta.
    echo.
    pause
    exit /b 1
)

if not exist "!APP!\package.json" (
    echo.
    echo  ERROR: La descarga quedo incompleta.
    echo  Borra la carpeta "!BASE!" y vuelve a dar doble clic.
    echo.
    pause
    exit /b 1
)

del /f /q "!ZIP!" >nul 2>&1
echo  Descarga lista.
echo.

:instalar
echo  [2/2] Instalando y abriendo SENAWORD...
echo  (La primera vez tarda unos minutos. No cierres las ventanas.)
echo.
timeout /t 3 /nobreak >nul

if exist "!APP!\INSTALAR_SENAWORD.bat" (
    call "!APP!\INSTALAR_SENAWORD.bat"
) else if exist "!APP!\start-dev.bat" (
    call "!APP!\start-dev.bat"
) else (
    echo.
    echo  ERROR: No se encontro el instalador en "!APP!".
    echo  Borra la carpeta "!BASE!" y vuelve a dar doble clic.
    echo.
    pause
    exit /b 1
)
