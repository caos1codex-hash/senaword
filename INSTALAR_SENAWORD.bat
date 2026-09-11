@echo off
REM =====================================================================
REM  SENAWORD - Instalador y lanzador universal para Windows
REM  Funciona en cualquier PC con Windows 10/11 (incluso recien
REM  formateada). Solo necesita internet la primera vez para descargar
REM  Node.js automaticamente.
REM
REM  Que hace solo, paso a paso:
REM   1. Verifica que esta en la carpeta del proyecto.
REM   2. Instala Node.js con winget si falta (oficial, con tu permiso).
REM   3. Instala las dependencias (usa la cache local .bun-cache si existe,
REM      sin descargar casi nada; si no, las descarga una vez).
REM   4. Crea el archivo .env y la base de datos local (SQLite).
REM   5. Libera el puerto 3000 si quedo ocupado (preguntando antes).
REM   6. Abre el navegador en http://localhost:3000/senaword y arranca.
REM
REM  Uso diario: doble clic a este archivo. Para detener: Ctrl + C.
REM =====================================================================
setlocal
chcp 65001 >nul 2>&1
title SENAWORD - Instalador
cd /d "%~dp0"

echo.
echo  ================================================
echo   SENAWORD - Instalador universal
echo  ================================================
echo.

if not exist "package.json" (
    echo  ERROR: No se encuentra package.json aqui:
    echo  %CD%
    echo.
    echo  Descomprime el ZIP completo y ejecuta este archivo
    echo  desde dentro de la carpeta "senaword".
    echo.
    pause
    exit /b 1
)

if not exist "start-dev.bat" (
    echo  ERROR: Falta start-dev.bat en esta carpeta.
    echo  Descarga el ZIP completo de nuevo.
    echo.
    pause
    exit /b 1
)

echo  Todo listo. Iniciando instalacion y servidor...
echo  (La primera vez tarda unos minutos. No cierres esta ventana.)
echo.
timeout /t 3 /nobreak >nul

call start-dev.bat
