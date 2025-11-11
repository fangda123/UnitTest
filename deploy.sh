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

SERVER_PATH="/root/project/unittest"
SSH_PORT=22

# ตรวจสอบว่ามี SSH key หรือไม่
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
USE_SSH_KEY=false

# ฟังก์ชันสำหรับเพิ่ม SSH key ไปยัง ssh-agent (เพื่อไม่ต้องใส่ passphrase บ่อย)
setup_ssh_agent() {
    if [ -f "$SSH_KEY_PATH" ] || [ -f "$HOME/.ssh/id_ed25519" ]; then
        # เริ่มต้น ssh-agent ถ้ายังไม่มี
        if [ -z "$SSH_AUTH_SOCK" ]; then
            eval "$(ssh-agent -s)" > /dev/null 2>&1
        fi
        
        # ตรวจสอบว่า key ถูกเพิ่มใน agent แล้วหรือยัง
        if ! ssh-add -l 2>/dev/null | grep -q "$SSH_KEY_PATH\|id_ed25519"; then
            echo -e "${BLUE}🔑 กำลังเพิ่ม SSH key ไปยัง ssh-agent...${NC}"
            echo -e "${YELLOW}💡 กรุณาใส่ passphrase ครั้งเดียว (จะเก็บไว้ใน memory)${NC}"
            ssh-add "$SSH_KEY_PATH" 2>/dev/null || ssh-add "$HOME/.ssh/id_ed25519" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ SSH key ถูกเพิ่มไปยัง ssh-agent แล้ว${NC}\n"
            else
                echo -e "${YELLOW}⚠️  ไม่สามารถเพิ่ม SSH key ไปยัง ssh-agent ได้${NC}\n"
            fi
        fi
    fi
}

# ตรวจสอบว่าผู้ใช้ต้องการใช้ password หรือไม่ (ถ้ามี argument แรกที่ไม่ใช่ flag)
if [ "$1" == "--password" ] || [ "$1" == "-p" ]; then
    # ใช้ password (explicit)
    USE_SSH_KEY=false
    if [ -z "$2" ]; then
        read -sp "กรุณาใส่รหัสผ่าน server: " SERVER_PASSWORD
        echo
    else
        SERVER_PASSWORD="$2"
    fi
elif [ -n "$1" ] && [ "$1" != "--key" ] && [ "$1" != "-k" ] && [ "$1" != "--force-password" ]; then
    # ถ้าใส่ argument แรกที่ไม่ใช่ flag ให้ตรวจสอบว่า SSH key ทำงานได้หรือไม่
    # ถ้า SSH key ทำงานได้ ให้ใช้ SSH key แทน (แนะนำ)
    if [ -f "$SSH_KEY_PATH" ] || [ -f "$HOME/.ssh/id_ed25519" ]; then
        if [ -f "$HOME/.ssh/id_ed25519" ]; then
            SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
        fi
        # ทดสอบว่า SSH key ทำงานได้หรือไม่
        setup_ssh_agent
        if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo test" >/dev/null 2>&1; then
            USE_SSH_KEY=true
            echo -e "${GREEN}✅ พบ SSH key และทำงานได้ - จะใช้ SSH key authentication${NC}"
            echo -e "${YELLOW}💡 ถ้าต้องการใช้ password แทน ให้ใช้: ./deploy.sh --force-password [password]${NC}\n"
        else
            # SSH key ไม่ทำงาน ใช้ password แทน
            USE_SSH_KEY=false
            SERVER_PASSWORD="$1"
            echo -e "${YELLOW}⚠️  SSH key ไม่สามารถเชื่อมต่อได้ - ใช้ password authentication แทน${NC}\n"
        fi
    else
        # ไม่มี SSH key ใช้ password
        USE_SSH_KEY=false
        SERVER_PASSWORD="$1"
        echo -e "${YELLOW}💡 ใช้ password authentication (จาก argument)${NC}\n"
    fi
elif [ -f "$SSH_KEY_PATH" ] || [ -f "$HOME/.ssh/id_ed25519" ]; then
    # ใช้ SSH key (ถ้ามี)
    if [ -f "$HOME/.ssh/id_ed25519" ]; then
        SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
    fi
    USE_SSH_KEY=true
    echo -e "${GREEN}✅ พบ SSH key: $SSH_KEY_PATH${NC}"
    echo -e "${YELLOW}💡 จะใช้ SSH key authentication${NC}"
    echo -e "${YELLOW}   ถ้าต้องการใช้ password แทน ให้ใช้: ./deploy.sh --password [password]${NC}\n"
    
    # Setup ssh-agent เพื่อไม่ต้องใส่ passphrase บ่อย
    setup_ssh_agent
else
    # ไม่มี SSH key และไม่มี argument - prompt password
    USE_SSH_KEY=false
    read -sp "กรุณาใส่รหัสผ่าน server: " SERVER_PASSWORD
    echo
fi

# รองรับ --force-password flag
if [ "$1" == "--force-password" ]; then
    USE_SSH_KEY=false
    if [ -z "$2" ]; then
        read -sp "กรุณาใส่รหัสผ่าน server: " SERVER_PASSWORD
        echo
    else
        SERVER_PASSWORD="$2"
    fi
fi

if [ "$USE_SSH_KEY" = false ] && [ -z "$SERVER_PASSWORD" ]; then
    echo -e "${RED}❌ ต้องระบุรหัสผ่าน server หรือมี SSH key${NC}"
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "   ${BLUE}./deploy.sh${NC}                    # ใช้ SSH key (ถ้ามี) หรือ prompt password"
    echo -e "   ${BLUE}./deploy.sh [password]${NC}         # ใช้ password"
    echo -e "   ${BLUE}./deploy.sh --password [password]${NC}  # ใช้ password (explicit)"
    exit 1
fi

echo -e "${BLUE}🚀 เริ่มต้น Deploy Process...${NC}\n"

# ตรวจสอบว่า sshpass ติดตั้งหรือไม่ (ถ้าใช้ password)
if [ "$USE_SSH_KEY" = false ] && ! command -v sshpass &> /dev/null; then
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

# สร้าง SSH command สำหรับใช้ในส่วนอื่นๆ
if [ "$USE_SSH_KEY" = true ]; then
    SSH_BASE_CMD="ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no -p $SSH_PORT"
    RSYNC_SSH_CMD="ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no -p $SSH_PORT"
else
    # ใช้ password - ปิด SSH key และบังคับใช้ password
    SSH_BASE_CMD="sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o PasswordAuthentication=yes -o IdentitiesOnly=yes -p $SSH_PORT"
    RSYNC_SSH_CMD="sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o PasswordAuthentication=yes -o IdentitiesOnly=yes -p $SSH_PORT"
fi

# ตรวจสอบการเชื่อมต่อ server
echo -e "${YELLOW}🔌 กำลังตรวจสอบการเชื่อมต่อ server...${NC}"

# ตรวจสอบ network connectivity ก่อน
echo -e "${BLUE}📡 ตรวจสอบ network connectivity...${NC}"
if ping -c 1 -W 3 "$SERVER_IP" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Server ตอบสนอง ping${NC}"
else
    echo -e "${YELLOW}⚠️  Server ไม่ตอบสนอง ping (อาจจะปิด ping หรือ firewall block)${NC}"
    echo -e "${YELLOW}   แต่จะลองเชื่อมต่อ SSH ต่อไป...${NC}"
fi

# ตรวจสอบ SSH port (ใช้ nc หรือ telnet)
echo -e "${BLUE}🔌 ตรวจสอบ SSH port...${NC}"
if command -v nc &> /dev/null; then
    if nc -z -w 3 "$SERVER_IP" "$SSH_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ SSH port $SSH_PORT เปิดอยู่${NC}"
    else
        echo -e "${YELLOW}⚠️  SSH port $SSH_PORT อาจไม่เปิดหรือถูก block${NC}"
        echo -e "${YELLOW}   แต่จะลองเชื่อมต่อ SSH ต่อไป...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  ไม่พบ nc (netcat) - ข้ามการตรวจสอบ port${NC}"
    echo -e "${YELLOW}   จะลองเชื่อมต่อ SSH โดยตรง...${NC}"
fi

# ลองเชื่อมต่อ SSH
echo -e "${BLUE}🔐 กำลังเชื่อมต่อ SSH...${NC}"

# ใช้ timeout ถ้ามี (macOS อาจไม่มี timeout command)
# เพิ่ม progress indicator
(
    while true; do
        echo -n "."
        sleep 1
    done
) &
PROGRESS_PID=$!

# สร้าง SSH command ตาม authentication method
if [ "$USE_SSH_KEY" = true ]; then
    # ใช้ SSH key
    SSH_CMD="ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o UserKnownHostsFile=/dev/null -p $SSH_PORT $SERVER_USER@$SERVER_IP"
else
    # ใช้ password กับ sshpass - ปิดการใช้งาน SSH key และบังคับใช้ password
    # ใช้ -v เพื่อดู verbose output (ถ้าต้องการ debug)
    SSH_CMD="sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o UserKnownHostsFile=/dev/null -o PreferredAuthentications=password -o PubkeyAuthentication=no -o PasswordAuthentication=yes -o IdentitiesOnly=yes -o NumberOfPasswordPrompts=1 -p $SSH_PORT $SERVER_USER@$SERVER_IP"
fi

# ใช้ timeout ถ้ามี
if command -v timeout &> /dev/null; then
    SSH_OUTPUT=$(timeout 15 bash -c "$SSH_CMD 'echo Connection successful'" 2>&1)
    SSH_EXIT_CODE=$?
elif command -v gtimeout &> /dev/null; then
    SSH_OUTPUT=$(gtimeout 15 bash -c "$SSH_CMD 'echo Connection successful'" 2>&1)
    SSH_EXIT_CODE=$?
else
    # ถ้าไม่มี timeout ใช้ background process + kill หลังจาก 15 วินาที
    bash -c "$SSH_CMD 'echo Connection successful'" > /tmp/ssh_output_$$.txt 2>&1 &
    SSH_PID=$!
    
    # รอ 15 วินาที หรือจนกว่า process จะเสร็จ
    for i in {1..15}; do
        if ! kill -0 $SSH_PID 2>/dev/null; then
            # Process เสร็จแล้ว
            break
        fi
        sleep 1
    done
    
    # ถ้ายังทำงานอยู่ ให้ kill
    if kill -0 $SSH_PID 2>/dev/null; then
        kill $SSH_PID 2>/dev/null
        SSH_EXIT_CODE=1
        SSH_OUTPUT="Connection timeout after 15 seconds"
    else
        wait $SSH_PID
        SSH_EXIT_CODE=$?
        SSH_OUTPUT=$(cat /tmp/ssh_output_$$.txt 2>/dev/null)
        rm -f /tmp/ssh_output_$$.txt
    fi
fi

# หยุด progress indicator
kill $PROGRESS_PID 2>/dev/null
wait $PROGRESS_PID 2>/dev/null
echo "" # New line after progress dots

if [ $SSH_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ เชื่อมต่อ server สำเร็จ${NC}\n"
else
    echo -e "${RED}❌ ไม่สามารถเชื่อมต่อ server ได้${NC}"
    echo -e "${YELLOW}💡 ตรวจสอบ:${NC}"
    echo -e "   - Server IP: ${SERVER_IP}"
    echo -e "   - SSH Port: ${SSH_PORT}"
    echo -e "   - Username: ${SERVER_USER}"
    if [ "$USE_SSH_KEY" = true ]; then
        echo -e "   - Authentication: SSH Key ($SSH_KEY_PATH)"
    else
        if [ ${#SERVER_PASSWORD} -gt 3 ]; then
            echo -e "   - Password: ${SERVER_PASSWORD:0:3}***"
        fi
    fi
    echo -e "\n${YELLOW}🔍 Error Details:${NC}"
    echo -e "${RED}$SSH_OUTPUT${NC}"
    echo -e "\n${YELLOW}💡 วิธีแก้ไข:${NC}"
    
    if echo "$SSH_OUTPUT" | grep -q "Permission denied (publickey"; then
        echo -e "${RED}⚠️  Server ปฏิเสธการเข้าสู่ระบบด้วย password!${NC}"
        echo -e ""
        echo -e "${YELLOW}ตัวเลือกที่ 1: ใช้ SSH Key (แนะนำ)${NC}"
        echo -e "   1. สร้าง SSH key (ถ้ายังไม่มี):"
        echo -e "      ${BLUE}ssh-keygen -t ed25519 -C \"your_email@example.com\"${NC}"
        echo -e "   2. Copy public key ไปยัง server:"
        echo -e "      ${BLUE}ssh-copy-id ${SERVER_USER}@${SERVER_IP}${NC}"
        echo -e "   3. ลองรัน deploy.sh อีกครั้ง"
        echo -e ""
        echo -e "${YELLOW}ตัวเลือกที่ 2: เปิดใช้งาน password authentication บน server${NC}"
        echo -e "   แก้ไขไฟล์ /etc/ssh/sshd_config:"
        echo -e "      ${BLUE}PasswordAuthentication yes${NC}"
        echo -e "      ${BLUE}PubkeyAuthentication yes${NC}"
        echo -e "   แล้ว restart SSH: ${BLUE}systemctl restart sshd${NC}"
        echo -e ""
        echo -e "${YELLOW}ตัวเลือกที่ 3: ใช้ password โดยตรง (ถ้า server อนุญาต)${NC}"
        echo -e "   ${BLUE}./deploy.sh --password [password]${NC}"
    else
        echo -e "${RED}⚠️  Permission denied - อาจเป็นเพราะ:${NC}"
        echo -e "   1. ${RED}Password ไม่ถูกต้อง${NC} (ตรวจสอบ password อีกครั้ง)"
        echo -e "   2. Username ไม่ถูกต้อง (ปัจจุบันใช้: ${SERVER_USER})"
        echo -e "   3. Server ปิดการใช้งาน password authentication"
        echo -e ""
        echo -e "${YELLOW}💡 ลองทดสอบด้วย SSH โดยตรง:${NC}"
        if [ "$USE_SSH_KEY" = true ]; then
            echo -e "   ${BLUE}ssh -i $SSH_KEY_PATH ${SERVER_USER}@${SERVER_IP}${NC}"
        else
            echo -e "   ${BLUE}sshpass -p 'YOUR_PASSWORD' ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no ${SERVER_USER}@${SERVER_IP} 'echo test'${NC}"
        fi
        echo -e ""
        echo -e "${YELLOW}💡 หรือลองใช้ SSH key (แนะนำ):${NC}"
        echo -e "   ${BLUE}ssh-copy-id ${SERVER_USER}@${SERVER_IP}${NC}"
        echo -e "   ${BLUE}./deploy.sh${NC}  # (ไม่ใส่ password จะใช้ SSH key)"
        echo -e ""
        echo -e "${YELLOW}💡 ตรวจสอบ password:${NC}"
        echo -e "   - Password ที่ใช้: ${SERVER_PASSWORD:0:3}***"
        echo -e "   - ตรวจสอบว่ามี special characters ที่ต้อง escape หรือไม่"
        echo -e "   - ลองใส่ password ใน quotes: ${BLUE}./deploy.sh --password 'MasterJ123\$'${NC}"
    fi
    exit 1
fi

# สร้าง directory บน server (ถ้ายังไม่มี)
echo -e "${YELLOW}📁 ตรวจสอบ directory บน server...${NC}"
$SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "
    if [ ! -d '$SERVER_PATH' ]; then
        mkdir -p '$SERVER_PATH'
        echo '✅ สร้าง directory สำเร็จ'
    else
        echo '✅ Directory มีอยู่แล้ว'
    fi
"

# Backup ข้อมูลเดิม (ถ้ามี)
echo -e "\n${YELLOW}💾 Backup ข้อมูลเดิม...${NC}"
$SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "
    if [ -d '$SERVER_PATH' ] && [ \"\$(ls -A $SERVER_PATH)\" ]; then
        BACKUP_DIR=\"${SERVER_PATH}_backup_\$(date +%Y%m%d_%H%M%S)\"
        cp -r '$SERVER_PATH' \"\$BACKUP_DIR\"
        echo \"✅ Backup สำเร็จ: \$BACKUP_DIR\"
    fi
"

# ส่งไฟล์ Backend
echo -e "\n${BLUE}📤 ส่งไฟล์ Backend...${NC}"
$SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH/BackEnd"
rsync -avz --progress -e "$RSYNC_SSH_CMD" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude '*.log' \
    BackEnd/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/BackEnd/"

# ส่งไฟล์ FrontendV2
echo -e "\n${BLUE}📤 ส่งไฟล์ FrontendV2...${NC}"
$SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH/FrontEndV2"
rsync -avz --progress -e "$RSYNC_SSH_CMD" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.vite' \
    FrontEndV2/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/FrontEndV2/"

# ส่งไฟล์ Frontend (ถ้ามี)
if [ -d "FrontEnd" ]; then
    echo -e "\n${BLUE}📤 ส่งไฟล์ Frontend...${NC}"
    $SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH/FrontEnd"
    rsync -avz --progress -e "$RSYNC_SSH_CMD" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude '.vite' \
        FrontEnd/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/FrontEnd/"
fi

# ส่งไฟล์อื่นๆ (package.json, ecosystem.config.js, etc.)
echo -e "\n${BLUE}📤 ส่งไฟล์ configuration...${NC}"
if [ "$USE_SSH_KEY" = true ]; then
    scp -i $SSH_KEY_PATH -o StrictHostKeyChecking=no -P $SSH_PORT \
        package.json \
        ecosystem.config.js \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"
else
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -P $SSH_PORT \
        package.json \
        ecosystem.config.js \
        "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"
fi

# ติดตั้ง dependencies บน server
echo -e "\n${YELLOW}📦 ติดตั้ง dependencies บน server...${NC}"
$SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "
    cd $SERVER_PATH
    
    # ติดตั้ง dependencies ทั้งหมด
    echo '📦 ติดตั้ง dependencies...'
    npm install
"

# Restart services ด้วย PM2
echo -e "\n${YELLOW}🔄 Restart services ด้วย PM2...${NC}"
$SSH_BASE_CMD "$SERVER_USER@$SERVER_IP" "
    cd $SERVER_PATH
    
    # Stop existing processes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Start services ด้วย ecosystem.config.js
    pm2 start ecosystem.config.js
    
    # Save PM2 process list
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
"

echo -e "\n${GREEN}✅ Deploy สำเร็จ!${NC}"
echo -e "${GREEN}🌐 Server: http://${SERVER_IP}${NC}"
echo -e "${GREEN}📋 Path: ${SERVER_PATH}${NC}"
echo -e "\n${YELLOW}💡 ตรวจสอบสถานะ: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'${NC}"
echo -e "${YELLOW}💡 ดู logs: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs'${NC}"
echo -e "${YELLOW}💡 Restart services: ssh ${SERVER_USER}@${SERVER_IP} 'cd ${SERVER_PATH} && pm2 restart all'${NC}"

