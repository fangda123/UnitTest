# 🚀 คู่มือการ Deploy

## 📋 เนื้อหา

1. [การเตรียมการก่อน Deploy](#การเตรียมการก่อน-deploy)
2. [Deploy ไปยัง Heroku](#deploy-ไปยัง-heroku)
3. [Deploy ไปยัง Railway](#deploy-ไปยัง-railway)
4. [Deploy ไปยัง AWS](#deploy-ไปยัง-aws)
5. [Deploy ด้วย Docker](#deploy-ด้วย-docker)

---

## 🔧 การเตรียมการก่อน Deploy

### 1. ตรวจสอบ Environment Variables

ตรวจสอบว่าไฟล์ `.env` มีค่าทั้งหมดที่จำเป็น:

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-strong-secret-key>
JWT_EXPIRE=7d
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
REDIS_TTL=60
BINANCE_API_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443
CRYPTO_SYMBOL=BTCUSDT
UPDATE_INTERVAL=60000
INTERNAL_API_KEY=<your-internal-api-key>
```

### 2. ทดสอบ Production Build

```bash
# ตั้งค่า NODE_ENV เป็น production
export NODE_ENV=production

# รัน server
npm start

# ทดสอบว่าทำงานปกติ
```

---

## 🟣 Deploy ไปยัง Heroku

### ขั้นตอนที่ 1: ติดตั้ง Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download จาก https://devcenter.heroku.com/articles/heroku-cli
```

### ขั้นตอนที่ 2: Login เข้า Heroku

```bash
heroku login
```

### ขั้นตอนที่ 3: สร้าง Heroku App

```bash
# สร้าง app ใหม่
heroku create your-app-name

# หรือให้ Heroku สร้างชื่อให้
heroku create
```

### ขั้นตอนที่ 4: เพิ่ม Add-ons

```bash
# MongoDB (mLab)
heroku addons:create mongolab:sandbox

# Redis
heroku addons:create heroku-redis:hobby-dev

# ตรวจสอบ add-ons
heroku addons
```

### ขั้นตอนที่ 5: ตั้งค่า Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-key
heroku config:set JWT_EXPIRE=7d
heroku config:set REDIS_TTL=60
heroku config:set BINANCE_API_URL=https://api.binance.com
heroku config:set BINANCE_WS_URL=wss://stream.binance.com:9443
heroku config:set CRYPTO_SYMBOL=BTCUSDT
heroku config:set UPDATE_INTERVAL=60000
heroku config:set INTERNAL_API_KEY=your-internal-api-key

# ตรวจสอบ config
heroku config
```

### ขั้นตอนที่ 6: Deploy

```bash
# Push code ไปยัง Heroku
git push heroku main

# หรือถ้าใช้ branch อื่น
git push heroku your-branch:main
```

### ขั้นตอนที่ 7: ตรวจสอบและทดสอบ

```bash
# เปิด app ใน browser
heroku open

# ดู logs
heroku logs --tail

# ตรวจสอบสถานะ
heroku ps
```

### การจัดการหลัง Deploy

```bash
# Restart app
heroku restart

# Scale dyno
heroku ps:scale web=1

# เข้าถึง database
heroku run bash
```

---

## 🚂 Deploy ไปยัง Railway

### ขั้นตอนที่ 1: สร้างบัญชี Railway

1. ไปที่ https://railway.app/
2. Sign up ด้วย GitHub

### ขั้นตอนที่ 2: สร้าง Project ใหม่

1. คลิก "New Project"
2. เลือก "Deploy from GitHub repo"
3. เชื่อมต่อ GitHub repository

### ขั้นตอนที่ 3: เพิ่ม Database

1. คลิก "New" → "Database"
2. เลือก MongoDB
3. คลิก "New" → "Database" อีกครั้ง
4. เลือก Redis

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

1. เข้าไปที่ Project Settings
2. คลิก "Variables"
3. เพิ่มตัวแปรทั้งหมด:

```
NODE_ENV=production
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
MONGODB_URI=${{MongoDB.MONGO_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
BINANCE_API_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443
CRYPTO_SYMBOL=BTCUSDT
UPDATE_INTERVAL=60000
INTERNAL_API_KEY=your-api-key
```

### ขั้นตอนที่ 5: Deploy

Railway จะ deploy อัตโนมัติเมื่อ push code ไปยัง GitHub

### การดู Logs

1. เข้าไปที่ Deployments
2. คลิกที่ deployment ล่าสุด
3. ดู logs ได้ real-time

---

## ☁️ Deploy ไปยัง AWS

### ขั้นตอนที่ 1: เตรียม AWS Account

1. สมัคร AWS Account
2. ติดตั้ง AWS CLI
3. Configure credentials

```bash
aws configure
```

### ขั้นตอนที่ 2: สร้าง EC2 Instance

```bash
# เลือก AMI: Ubuntu Server 22.04 LTS
# Instance Type: t2.micro (Free tier)
# Security Group: เปิด port 22 (SSH) และ 80/443 (HTTP/HTTPS)
```

### ขั้นตอนที่ 3: เชื่อมต่อกับ EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### ขั้นตอนที่ 4: ติดตั้ง Dependencies

```bash
# อัพเดท system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ติดตั้ง PM2
sudo npm install -g pm2

# ติดตั้ง MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# ติดตั้ง Redis
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### ขั้นตอนที่ 5: Deploy Application

```bash
# Clone repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env
nano .env
# (ใส่ environment variables)

# เริ่ม application ด้วย PM2
pm2 start src/server.js --name backend-api
pm2 save
pm2 startup
```

### ขั้นตอนที่ 6: ติดตั้ง Nginx (Optional)

```bash
# ติดตั้ง Nginx
sudo apt install -y nginx

# สร้าง configuration
sudo nano /etc/nginx/sites-available/backend-api

# เพิ่ม config
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/backend-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### ขั้นตอนที่ 7: ติดตั้ง SSL (Optional)

```bash
# ติดตั้ง Certbot
sudo apt install -y certbot python3-certbot-nginx

# รับ SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

## 🐳 Deploy ด้วย Docker

### ขั้นตอนที่ 1: สร้าง Dockerfile

สร้างไฟล์ `Dockerfile`:

```dockerfile
FROM node:18-alpine

# สร้าง working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### ขั้นตอนที่ 2: สร้าง docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/backend_test
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=your-secret-key
      - INTERNAL_API_KEY=your-api-key
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  mongo-data:
  redis-data:
```

### ขั้นตอนที่ 3: Build และ Run

```bash
# Build image
docker-compose build

# Start containers
docker-compose up -d

# ดู logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### การ Deploy ไปยัง Docker Registry

```bash
# Build image
docker build -t your-username/backend-api:latest .

# Push to Docker Hub
docker login
docker push your-username/backend-api:latest

# Pull และ run บน server
docker pull your-username/backend-api:latest
docker run -d -p 3000:3000 --env-file .env your-username/backend-api:latest
```

---

## 🔍 การตรวจสอบหลัง Deploy

### Health Check

```bash
curl https://your-domain.com/api/health
```

Expected Response:
```json
{
  "success": true,
  "message": "API กำลังทำงานปกติ",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### ทดสอบ Endpoints

```bash
# Test register
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Test crypto price
curl https://your-domain.com/api/crypto/price/BTCUSDT
```

---

## 📊 Monitoring

### Heroku

```bash
# View metrics
heroku metrics

# View logs
heroku logs --tail --source app
```

### PM2 (AWS/VPS)

```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor
pm2 monit
```

### Docker

```bash
# View container stats
docker stats

# View logs
docker logs -f container-name
```

---

## 🔄 การอัพเดท Application

### Heroku

```bash
git push heroku main
```

### Railway

```bash
git push origin main
# Railway จะ auto-deploy
```

### AWS/VPS

```bash
# SSH เข้า server
ssh -i your-key.pem ubuntu@your-ec2-ip

# Pull latest code
cd your-repo
git pull

# Restart application
pm2 restart backend-api
```

### Docker

```bash
# Pull latest image
docker-compose pull

# Restart containers
docker-compose up -d
```

---

## ⚠️ Troubleshooting

### ปัญหาที่พบบ่อย

1. **MongoDB Connection Error**
   - ตรวจสอบ `MONGODB_URI` ใน environment variables
   - ตรวจสอบว่า MongoDB service กำลังทำงาน
   - ตรวจสอบ network/firewall rules

2. **Redis Connection Error**
   - ตรวจสอบ Redis host และ port
   - ตรวจสอบว่า Redis service กำลังทำงาน
   - System จะทำงานต่อได้แม้ไม่มี Redis (แต่ไม่มี cache)

3. **WebSocket Not Working**
   - ตรวจสอบว่า server รองรับ WebSocket upgrades
   - ตรวจสอบ reverse proxy configuration (Nginx)

4. **Port Already in Use**
   ```bash
   # ค้นหา process ที่ใช้ port
   lsof -i :3000
   
   # Kill process
   kill -9 PID
   ```

---

## 📝 Checklist ก่อน Deploy

- [ ] ทดสอบ application ใน local environment
- [ ] ตั้งค่า environment variables ทั้งหมด
- [ ] เปลี่ยน `NODE_ENV` เป็น `production`
- [ ] ใช้ JWT_SECRET ที่แข็งแกร่ง
- [ ] ตั้งค่า CORS ให้ถูกต้อง
- [ ] ตรวจสอบ database connection
- [ ] ตรวจสอบ Redis connection
- [ ] ทดสอบ API endpoints ทั้งหมด
- [ ] ตรวจสอบ WebSocket connection
- [ ] ตั้งค่า monitoring และ logging
- [ ] Backup database
- [ ] เตรียม rollback plan

---

## 🎯 สรุป

หลังจาก deploy สำเร็จแล้ว คุณจะได้:

- ✅ API ที่ทำงานบน production server
- ✅ MongoDB และ Redis ที่ configure แล้ว
- ✅ HTTPS/SSL (ถ้าติดตั้ง)
- ✅ Monitoring และ logging
- ✅ Auto-restart on crash (PM2)

**URL ตัวอย่าง:**
- Heroku: `https://your-app-name.herokuapp.com`
- Railway: `https://your-app-name.railway.app`
- AWS: `https://your-domain.com`

**API Documentation:**
- Swagger: `https://your-domain.com/api-docs`

---

**Good luck! 🚀**

