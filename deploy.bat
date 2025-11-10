@echo off
REM Deploy Script for Windows
REM Script สำหรับ deploy application ลง server

setlocal enabledelayedexpansion

REM Configuration
set SERVER_IP=172.105.118.30
set SERVER_USER=root
set SERVER_PATH=/var/www/crypto-dashboard
set SSH_PORT=22

REM รับ password จาก command line
if "%1"=="" (
    set /p SERVER_PASSWORD="กรุณาใส่รหัสผ่าน server: "
) else (
    set SERVER_PASSWORD=%1
)

if "%SERVER_PASSWORD%"=="" (
    echo ❌ ต้องระบุรหัสผ่าน server
    echo Usage: deploy.bat [password]
    exit /b 1
)

echo 🚀 เริ่มต้น Deploy Process...
echo.

REM ตรวจสอบว่า plink หรือ pscp มีอยู่หรือไม่
where plink >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ไม่พบ plink - กรุณาติดตั้ง PuTTY
    echo 💡 ดาวน์โหลด: https://www.putty.org/
    exit /b 1
)

REM ตรวจสอบการเชื่อมต่อ server
echo 🔌 กำลังตรวจสอบการเชื่อมต่อ server...
plink -ssh -P %SSH_PORT% -pw %SERVER_PASSWORD% %SERVER_USER%@%SERVER_IP% "echo Connection successful" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ไม่สามารถเชื่อมต่อ server ได้
    exit /b 1
)
echo ✅ เชื่อมต่อ server สำเร็จ
echo.

REM สร้าง directory บน server
echo 📁 ตรวจสอบ directory บน server...
plink -ssh -P %SSH_PORT% -pw %SERVER_PASSWORD% %SERVER_USER%@%SERVER_IP% "if [ ! -d '%SERVER_PATH%' ]; then mkdir -p '%SERVER_PATH%'; fi"

REM Backup ข้อมูลเดิม
echo 💾 Backup ข้อมูลเดิม...
plink -ssh -P %SSH_PORT% -pw %SERVER_PASSWORD% %SERVER_USER%@%SERVER_IP% "if [ -d '%SERVER_PATH%' ] && [ \"\$(ls -A %SERVER_PATH%)\" ]; then BACKUP_DIR=\"%SERVER_PATH%_backup_\$(date +%%Y%%m%%d_%%H%%M%%S)\"; cp -r '%SERVER_PATH%' \"\$BACKUP_DIR\"; echo Backup สำเร็จ: \$BACKUP_DIR; fi"

REM ส่งไฟล์ Backend
echo 📤 ส่งไฟล์ Backend...
pscp -r -P %SSH_PORT% -pw %SERVER_PASSWORD% BackEnd %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/

REM ส่งไฟล์ FrontendV2
echo 📤 ส่งไฟล์ FrontendV2...
pscp -r -P %SSH_PORT% -pw %SERVER_PASSWORD% FrontEndV2 %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/

REM ส่งไฟล์ Frontend (ถ้ามี)
if exist FrontEnd (
    echo 📤 ส่งไฟล์ Frontend...
    pscp -r -P %SSH_PORT% -pw %SERVER_PASSWORD% FrontEnd %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/
)

REM ส่งไฟล์ configuration
echo 📤 ส่งไฟล์ configuration...
pscp -P %SSH_PORT% -pw %SERVER_PASSWORD% package.json %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/

REM ติดตั้ง dependencies และ build บน server
echo 📦 ติดตั้ง dependencies บน server...
plink -ssh -P %SSH_PORT% -pw %SERVER_PASSWORD% %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && cd BackEnd && npm install --production && cd ../FrontEndV2 && npm install && npm run build"

REM Restart services ด้วย PM2
echo 🔄 Restart services ด้วย PM2...
plink -ssh -P %SSH_PORT% -pw %SERVER_PASSWORD% %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && pm2 stop all 2>/dev/null || true && pm2 delete all 2>/dev/null || true && cd BackEnd && pm2 start npm --name 'crypto-backend' -- start && pm2 save && pm2 status"

echo.
echo ✅ Deploy สำเร็จ!
echo 🌐 Server: http://%SERVER_IP%
echo 📋 Path: %SERVER_PATH%

endlocal

