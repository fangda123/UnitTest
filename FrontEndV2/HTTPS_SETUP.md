# 🔒 การแก้ปัญหา Mixed Content (HTTPS Frontend + HTTP Backend)

## ปัญหา
เมื่อ frontend อยู่บน HTTPS (`https://binance.iotstart.me`) แต่ backend อยู่บน HTTP (`http://172.105.118.30:1111`), browser จะ block requests เนื่องจาก Mixed Content Policy.

## วิธีแก้ไข

### วิธีที่ 1: ตั้งค่า Backend ให้รองรับ HTTPS (แนะนำ)

#### ขั้นตอนที่ 1: ติดตั้ง SSL Certificate
```bash
# ติดตั้ง Certbot
sudo apt install -y certbot

# รับ SSL certificate (ถ้ามี domain name)
sudo certbot certonly --standalone -d api.yourdomain.com

# หรือใช้ self-signed certificate สำหรับ IP
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/backend.key \
  -out /etc/ssl/certs/backend.crt \
  -subj "/CN=172.105.118.30"
```

#### ขั้นตอนที่ 2: ตั้งค่า Backend ให้รองรับ HTTPS
แก้ไขไฟล์ `BackEnd/src/server.js`:
```javascript
const https = require('https');
const fs = require('fs');

// อ่าน SSL certificates
const options = {
  key: fs.readFileSync('/etc/ssl/private/backend.key'),
  cert: fs.readFileSync('/etc/ssl/certs/backend.crt')
};

// สร้าง HTTPS server
const server = https.createServer(options, app);
server.listen(1111, () => {
  console.log(`✅ HTTPS Server running on port 1111`);
});
```

#### ขั้นตอนที่ 3: ตั้งค่า Frontend
สร้างไฟล์ `.env.production`:
```bash
VITE_API_URL=https://172.105.118.30:1111
VITE_WS_URL=wss://172.105.118.30:1111/ws
```

### วิธีที่ 2: ใช้ Nginx Reverse Proxy (แนะนำสำหรับ Production)

#### ขั้นตอนที่ 1: ติดตั้ง Nginx บน Backend Server
```bash
sudo apt install -y nginx
```

#### ขั้นตอนที่ 2: ตั้งค่า Nginx
สร้างไฟล์ `/etc/nginx/sites-available/backend-api`:
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com; # หรือ IP address

    ssl_certificate /etc/ssl/certs/backend.crt;
    ssl_certificate_key /etc/ssl/private/backend.key;

    location / {
        proxy_pass http://localhost:1111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### ขั้นตอนที่ 3: Enable site และ restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/backend-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### ขั้นตอนที่ 4: ตั้งค่า Frontend
สร้างไฟล์ `.env.production`:
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws
```

### วิธีที่ 3: ใช้ Vite Proxy (สำหรับ Development)

แก้ไขไฟล์ `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://172.105.118.30:1111',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://172.105.118.30:1111',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
```

แล้วใช้ relative URL ใน frontend:
```typescript
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

### วิธีที่ 4: ตั้งค่า Environment Variable (ชั่วคราว)

สร้างไฟล์ `.env.production` ใน frontend:
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws
```

หรือถ้า backend รองรับ HTTPS แล้ว:
```bash
VITE_API_URL=https://172.105.118.30:1111
VITE_WS_URL=wss://172.105.118.30:1111/ws
```

## หมายเหตุ

- **วิธีที่ 1 และ 2** เหมาะสำหรับ Production
- **วิธีที่ 3** เหมาะสำหรับ Development
- **วิธีที่ 4** ใช้เมื่อ backend รองรับ HTTPS แล้ว

## การตรวจสอบ

หลังจากตั้งค่าแล้ว ให้ตรวจสอบว่า:
1. Backend รองรับ HTTPS: `curl -k https://172.105.118.30:1111/api/health`
2. Frontend สามารถเรียก API ได้โดยไม่มี Mixed Content errors
3. WebSocket connection ทำงานได้ (wss://)

