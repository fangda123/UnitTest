@echo off
REM Script สำหรับรัน Backend, FrontEndV2, และ FrontEnd พร้อมกัน (Windows)
REM Ports:
REM - Backend: 1111
REM - FrontEndV2: 1113
REM - FrontEnd: 1112

echo ========================================
echo  Starting All Services
echo ========================================
echo.

REM สร้างโฟลเดอร์ logs ถ้ายังไม่มี
if not exist logs mkdir logs

REM ตรวจสอบ dependencies
echo [INFO] Checking dependencies...
if not exist BackEnd\node_modules (
    echo [WARNING] BackEnd: Installing dependencies...
    cd BackEnd
    call npm install
    cd ..
)

if not exist FrontEndV2\node_modules (
    echo [WARNING] FrontEndV2: Installing dependencies...
    cd FrontEndV2
    call npm install
    cd ..
)

if not exist FrontEnd\node_modules (
    echo [WARNING] FrontEnd: Installing dependencies...
    cd FrontEnd
    call npm install
    cd ..
)

echo [SUCCESS] Dependencies ready
echo.

REM เริ่มต้น Backend
echo [INFO] Starting Backend (Port: 1111)...
start "Backend" cmd /k "cd BackEnd && npm start"
timeout /t 2 /nobreak >nul

REM เริ่มต้น FrontEndV2
echo [INFO] Starting FrontEndV2 (Port: 1113)...
start "FrontEndV2" cmd /k "cd FrontEndV2 && npm run dev"
timeout /t 2 /nobreak >nul

REM เริ่มต้น FrontEnd
echo [INFO] Starting FrontEnd (Port: 1112)...
start "FrontEnd" cmd /k "cd FrontEnd && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo  [SUCCESS] Services Started!
echo ========================================
echo.
echo  URLs:
echo    Backend:     http://localhost:1111
echo    Backend Docs: http://localhost:1111/api-docs
echo    FrontEndV2:   http://localhost:1113
echo    FrontEnd:     http://localhost:1112
echo.
echo  Press any key to exit...
echo ========================================
pause >nul

