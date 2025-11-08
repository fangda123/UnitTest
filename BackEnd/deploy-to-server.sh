#!/bin/bash

# Deploy Script สำหรับ Server 172.105.118.30
# คำแนะนำ: รันสคริปต์นี้บน server

echo "🚀 Deploy Backend API to Server"
echo "================================"

# 1. อัพเดทระบบ
echo "📦 1. อัพเดทระบบ..."
sudo apt update && sudo apt upgrade -y

# 2. ติดตั้ง Node.js (ถ้ายังไม่มี)
echo "📦 2. ติดตั้ง Node.js..."
if ! command -v node &> /dev/null
then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "   ✅ Node version: $(node -v)"
echo "   ✅ npm version: $(npm -v)"

# 3. ติดตั้ง PM2 (Process Manager)
echo "📦 3. ติดตั้ง PM2..."
sudo npm install -g pm2

# 4. Clone หรือ Upload code
echo "📦 4. เตรียม code..."
# git clone <your-repo-url>
# หรือ upload ไฟล์ด้วย scp/sftp

# 5. ติดตั้ง dependencies
echo "📦 5. ติดตั้ง dependencies..."
npm install --production

# 6. สร้างไฟล์ .env
echo "📦 6. สร้างไฟล์ .env..."
cat > .env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/backend_test

# JWT Configuration
JWT_SECRET=backend-test-jwt-secret-key-production-2024-secure
JWT_EXPIRE=7d

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=60

# Binance API Configuration
BINANCE_API_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443
CRYPTO_SYMBOL=BTCUSDT
UPDATE_INTERVAL=60000

# Internal API Authentication
INTERNAL_API_KEY=backend-test-internal-api-key-2024-secure

# API URL
API_URL=http://172.105.118.30:3000
EOF

# 7. เริ่ม application ด้วย PM2
echo "🚀 7. เริ่ม application..."
pm2 start src/server.js --name backend-api
pm2 save
pm2 startup

# 8. ตั้งค่า Nginx (Optional)
echo "📦 8. ติดตั้ง Nginx (Optional)..."
read -p "ต้องการติดตั้ง Nginx? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    sudo apt install -y nginx
    
    # สร้าง Nginx config
    sudo tee /etc/nginx/sites-available/backend-api > /dev/null << 'NGINX'
server {
    listen 80;
    server_name 172.105.118.30;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX

    sudo ln -sf /etc/nginx/sites-available/backend-api /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    
    echo "✅ Nginx ติดตั้งเรียบร้อย"
fi

# 9. ตั้งค่า Firewall
echo "🔒 9. ตั้งค่า Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

echo ""
echo "✅ Deploy เสร็จสมบูรณ์!"
echo ""
echo "📋 คำสั่งที่มีประโยชน์:"
echo "   pm2 status              - ดูสถานะ application"
echo "   pm2 logs backend-api    - ดู logs"
echo "   pm2 restart backend-api - restart application"
echo "   pm2 stop backend-api    - หยุด application"
echo "   pm2 delete backend-api  - ลบ application"
echo ""
echo "🌐 API URL: http://172.105.118.30:3000"
echo "📚 API Docs: http://172.105.118.30:3000/api-docs"
echo ""

