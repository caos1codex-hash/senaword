@echo off
REM =====================================================================
REM  Sena Word - Servidor local automatico
REM  Script abierto y legible: solo usa node, npm/bun, winget y comandos
REM  normales de Windows. Disenado para no activar el antivirus:
REM  no descarga ni ejecuta codigo desde internet, no cambia politicas
REM  del sistema, no corre nada oculto y no cierra procesos sin preguntar.
REM =====================================================================
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Sena Word - Servidor Local

set "PORT=3000"
set "URL=http://localhost:%PORT%/senaword"
set "PM="
set "PX="

echo ================================================
echo   Sena Word - Servidor local automatico
echo   Compatible con Windows Defender
echo ================================================
echo.

REM ---------- 1. Verificar Node.js (solo lectura + winget oficial) ----------
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [1/6] Node.js no encontrado. Intentando instalarlo con winget...
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo Instalando Node.js LTS con winget ^(puede pedir permiso^)...
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        where node >nul 2>nul
        if !errorlevel! neq 0 (
            echo.
            echo No se pudo instalar Node.js automaticamente.
            echo Descargalo gratis aqui: https://nodejs.org/
            echo Instalalo, reinicia el PC y vuelve a dar doble clic a este archivo.
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo ERROR: Node.js no esta instalado en este PC.
        echo Descargalo gratis aqui: https://nodejs.org/
        echo Instalalo y vuelve a dar doble clic a este archivo.
        echo.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('node -v') do set "NODEV=%%v"
echo [1/6] Node.js OK ^(!NODEV!^)

REM ---------- 2. Gestor de paquetes ----------
REM Bun es opcional y solo se instala con winget (paquete firmado).
REM JAMAS se descarga con scripts de internet: asi no lo bloquea el antivirus.
REM Si no hay Bun, se usa npm que ya viene con Node.js y funciona igual.
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [2/6] Bun no detectado. Intentando instalarlo con winget ^(opcional^)...
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        winget install -e --id Oven-sh.Bun --accept-source-agreements --accept-package-agreements
        if exist "%USERPROFILE%\.bun\bin\bun.exe" set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
        if exist "%LOCALAPPDATA%\Programs\Bun\bun.exe" set "PATH=%LOCALAPPDATA%\Programs\Bun;!PATH!"
        where bun >nul 2>nul
    )
)
where bun >nul 2>nul
if %errorlevel% equ 0 (
    set "PM=bun"
    set "PX=bunx"
    REM Cache de paquetes DENTRO del proyecto: viaja con la carpeta e
    REM instala offline sin descargar nada.
    set "BUN_INSTALL_CACHE_DIR=%CD%\.bun-cache"
    echo [2/6] Gestor de paquetes: bun ^(offline con .bun-cache^)
) else (
    set "PM=npm"
    set "PX=npx"
    echo [2/6] Gestor de paquetes: npm ^(funciona igual, requiere internet la primera vez^).
    echo         Opcional: instala Bun desde https://bun.sh con winget:
    echo         winget install -e --id Oven-sh.Bun
)

REM ---------- 3. Instalar / reparar dependencias ----------
if not exist "package.json" (
    echo.
    echo ERROR: No se encontro package.json en "%CD%".
    echo Este .bat debe estar dentro de la carpeta del proyecto senaword.
    echo.
    pause
    exit /b 1
)
REM Si la carpeta se movio o copio a otro lugar/PC, node_modules queda
REM con rutas absolutas viejas y NADA funciona: se detecta y reinstala solo.
set "REINSTALL=0"
if not exist "node_modules" (
    set "REINSTALL=1"
) else if not exist "node_modules\.senaword-path" (
    set "REINSTALL=1"
) else (
    set "OLDPATH="
    set /p OLDPATH=<"node_modules\.senaword-path"
    if /i "!OLDPATH!" neq "%CD%" set "REINSTALL=1"
)
if "!REINSTALL!"=="1" (
    if exist ".bun-cache\" (
        echo [3/6] Instalando dependencias desde la cache local ^(sin internet^)...
    ) else (
        echo [3/6] Instalando dependencias con !PM! ^(solo la primera vez tarda unos minutos^)...
        echo         El antivirus puede tardar en revisar los archivos. No lo cierres.
    )
    if exist "node_modules" (
        echo Limpiando instalacion anterior de otra carpeta...
        rmdir /s /q "node_modules"
    )
    if exist ".next" rmdir /s /q ".next"
    echo Instalando dependencias, un momento...
    if "!PM!"=="bun" (
        bun install
    ) else (
        call npm install
    )
    set "INSTALLERR=!errorlevel!"
    if !INSTALLERR! neq 0 (
        echo.
        echo ERROR al instalar dependencias. Revisa tu internet y reintenta.
        echo Vuelve a dar doble clic a este archivo.
        echo.
        pause
        exit /b 1
    )
    > "node_modules\.senaword-path" echo %CD%
) else (
    echo [3/6] Dependencias ya instaladas. OK.
)

REM ---------- 4. Crear / reparar .env portable (SQLite local) ----------
REM El .env vale solo si trae el valor portable canonico; cualquier otra
REM cosa (rutas de otro PC, basura) se regenera. Asi no hay falsos positivos.
set "NEEDENV=1"
if exist ".env" (
    findstr /C:"file:./dev.db" .env >nul 2>nul
    if !errorlevel! equ 0 set "NEEDENV=0"
)
if "!NEEDENV!"=="1" (
    echo [4/6] Creando .env portable con base de datos local...
    > ".env" echo DATABASE_URL="file:./dev.db"
) else (
    echo [4/6] Archivo .env OK.
)

REM ---------- 5. Preparar base de datos (Prisma + SQLite, sin internet extra) ----------
echo [5/6] Preparando base de datos local...
if "!PM!"=="bun" (
    bunx prisma generate
) else (
    call npx prisma generate
)
if "!PM!"=="bun" (
    bunx prisma db push
) else (
    call npx prisma db push
)
set "DBERR=!errorlevel!"
if !DBERR! neq 0 (
    echo.
    echo AVISO: No se pudo crear la base de datos, pero el servidor igual arrancara.
    echo Si ves errores de "GameSession", borra prisma\dev.db y reintenta.
    echo.
)

REM ---------- 6. Revisar puerto 3000 (pregunta antes de tocar nada) ----------
set "PIDBUSY="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set "PIDBUSY=%%a"
)
if defined PIDBUSY (
    echo.
    echo El puerto %PORT% esta ocupado por el proceso !PIDBUSY!.
    echo Normalmente es otro servidor anterior que quedo abierto.
    set "RESP="
    set /p "RESP=Deseas detener ese proceso para liberar el puerto? (S/N): "
    if /i "!RESP!"=="S" (
        taskkill /F /PID !PIDBUSY!
        echo Puerto %PORT% liberado.
    ) else (
        echo Se continuara igual. Si el servidor no arranca, cierra el otro programa y reintenta.
    )
)
echo [6/6] Arrancando servidor...

echo.
echo ================================================
echo  Servidor: %URL%
echo  El navegador se abrira solo. La primera vez
echo  compila 1-3 min: espera y recarga si hace falta.
echo  NO cierres esta ventana mientras lo uses.
echo  Para detenerlo presiona Ctrl + C.
echo ================================================
echo.

REM Abrir el navegador con el comando normal de Windows (sin PowerShell).
REM Se abre ANTES del servidor porque el servidor ocupa esta ventana.
timeout /t 8 /nobreak >nul
start "" "%URL%"

REM ---------- 7. Arrancar servidor en primer plano ----------
if "!PM!"=="bun" (
    bun run dev
) else (
    call npm run dev
)

echo.
echo El servidor se detuvo.
pause
