#!/bin/bash

# Deploy Script
# Script สำหรับ deploy application ลง server

# สีสำหรับ output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="172.105.118.30"
SERVER_USER="root"
SERVER_PATH="/var/www/crypto-dashboard"
SSH_PORT=22

# รับ password จาก command line หรือ prompt
if [ -z "$1" ]; then
    read -sp "กรุณาใส่รหัสผ่าน server: " SERVER_PASSWORD
    echo
else
    SERVER_PASSWORD="$1"
fi

if [ -z "$SERVER_PASSWORD" ]; then
    echo -e "${RED}❌ ต้องระบุรหัสผ่าน server${NC}"
    echo -e "${YELLOW}Usage: ./deploy.sh [password]${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 เริ่มต้น Deploy Process...${NC}\n"

# ตรวจสอบว่า sshpass ติดตั้งหรือไม่
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  sshpass ไม่พบ - กำลังติดตั้ง...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo -e "${RED}❌ กรุณาติดตั้ง Homebrew ก่อน: https://brew.sh${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}กรุณาติดตั้ง sshpass: sudo apt-get install sshpass${NC}"
        exit 1
    fi
fi

# ตรวจสอบการเชื่อมต่อ server
echo -e "${YELLOW}🔌 กำลังตรวจสอบการเชื่อมต่อ server...${NC}"
if timeout 10 sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "echo 'Connection successful'" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ เชื่อมต่อ server สำเร็จ${NC}\n"
else
    echo -e "${RED}❌ ไม่สามารถเชื่อมต่อ server ได้${NC}"
    echo -e "${YELLOW}💡 ตรวจสอบ:${NC}"
    echo -e "   - Server IP: ${SERVER_IP}"
    echo -e "   - SSH Port: ${SSH_PORT}"
    echo -e "   - Username: ${SERVER_USER}"
    if [ ${#SERVER_PASSWORD} -gt 3 ]; then
        echo -e "   - Password: ${SERVER_PASSWORD:0:3}***"
    fi
    exit 1
fi

# สร้าง directory บน server (ถ้ายังไม่มี)
echo -e "${YELLOW}📁 ตรวจสอบ directory บน server...${NC}"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "
    if [ ! -d '$SERVER_PATH' ]; then
        mkdir -p '$SERVER_PATH'
        echo '✅ สร้าง directory สำเร็จ'
    else
        echo '✅ Directory มีอยู่แล้ว'
    fi
"

# Backup ข้อมูลเดิม (ถ้ามี)
echo -e "\n${YELLOW}💾 Backup ข้อมูลเดิม...${NC}"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "
    if [ -d '$SERVER_PATH' ] && [ \"\$(ls -A $SERVER_PATH)\" ]; then
        BACKUP_DIR=\"${SERVER_PATH}_backup_\$(date +%Y%m%d_%H%M%S)\"
        cp -r '$SERVER_PATH' \"\$BACKUP_DIR\"
        echo \"✅ Backup สำเร็จ: \$BACKUP_DIR\"
    fi
"

# ส่งไฟล์ Backend
echo -e "\n${BLUE}📤 ส่งไฟล์ Backend...${NC}"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH/BackEnd"
rsync -avz --progress -e "sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -p $SSH_PORT" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude '*.log' \
    BackEnd/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/BackEnd/"

# ส่งไฟล์ FrontendV2
echo -e "\n${BLUE}📤 ส่งไฟล์ FrontendV2...${NC}"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH/FrontEndV2"
rsync -avz --progress -e "sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -p $SSH_PORT" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.vite' \
    FrontEndV2/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/FrontEndV2/"

# ส่งไฟล์ Frontend (ถ้ามี)
if [ -d "FrontEnd" ]; then
    echo -e "\n${BLUE}📤 ส่งไฟล์ Frontend...${NC}"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH/FrontEnd"
    rsync -avz --progress -e "sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -p $SSH_PORT" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude '.vite' \
        FrontEnd/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/FrontEnd/"
fi

# ส่งไฟล์อื่นๆ (package.json, scripts, etc.)
echo -e "\n${BLUE}📤 ส่งไฟล์ configuration...${NC}"
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -P $SSH_PORT \
    package.json \
    "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# ติดตั้ง dependencies และ build บน server
echo -e "\n${YELLOW}📦 ติดตั้ง dependencies บน server...${NC}"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "
    cd $SERVER_PATH
    
    # ติดตั้ง Backend dependencies
    echo '📦 ติดตั้ง Backend dependencies...'
    cd BackEnd
    if [ ! -d 'node_modules' ]; then
        npm install --production
    else
        npm install --production
    fi
    
    # Build FrontendV2
    echo '🏗️  Build FrontendV2...'
    cd ../FrontEndV2
    if [ ! -d 'node_modules' ]; then
        npm install
    fi
    npm run build
    
    # Build Frontend (ถ้ามี)
    if [ -d '../FrontEnd' ]; then
        echo '🏗️  Build Frontend...'
        cd ../FrontEnd
        if [ ! -d 'node_modules' ]; then
            npm install
        fi
        npm run build
    fi
"

# Restart services ด้วย PM2
echo -e "\n${YELLOW}🔄 Restart services ด้วย PM2...${NC}"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SERVER_USER@$SERVER_IP" "
    cd $SERVER_PATH
    
    # Stop existing processes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Start Backend
    echo '🚀 เริ่มต้น Backend...'
    cd BackEnd
    pm2 start npm --name 'crypto-backend' -- start
    pm2 save
    
    # Start FrontendV2 (ถ้าต้องการ)
    # cd ../FrontEndV2
    # pm2 serve dist 1113 --name 'crypto-frontend-v2' --spa
    # pm2 save
    
    # Show status
    pm2 status
"

echo -e "\n${GREEN}✅ Deploy สำเร็จ!${NC}"
echo -e "${GREEN}🌐 Server: http://${SERVER_IP}${NC}"
echo -e "${GREEN}📋 Path: ${SERVER_PATH}${NC}"
echo -e "\n${YELLOW}💡 ตรวจสอบสถานะ: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'${NC}"
echo -e "${YELLOW}💡 ดู logs: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs'${NC}"

