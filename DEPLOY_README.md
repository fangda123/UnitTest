# Deploy Scripts Documentation

## 📋 Overview

Scripts สำหรับ push code ขึ้น Git และ deploy application ลง server

## 🚀 Git Push Script

### `git-push.sh` (macOS/Linux)

Script สำหรับ push code ขึ้น Git repository

**Usage:**
```bash
chmod +x git-push.sh
./git-push.sh
```

**Features:**
- ✅ ตรวจสอบ git status
- ✅ เพิ่มไฟล์ทั้งหมด
- ✅ Commit พร้อม message
- ✅ Push ไปยัง remote repository
- ✅ รองรับทุก branch

## 📤 Deploy Scripts

### `deploy.sh` (macOS/Linux)

Script สำหรับ deploy application ลง server

**Requirements:**
- `sshpass` - สำหรับส่ง password ผ่าน SSH
- `rsync` - สำหรับ sync ไฟล์
- `ssh` - SSH client

**Install sshpass (macOS):**
```bash
brew install hudochenkov/sshpass/sshpass
```

**Install sshpass (Linux):**
```bash
sudo apt-get install sshpass
```

**Usage:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Configuration:**
แก้ไขตัวแปรใน script:
```bash
SERVER_IP="172.105.118.30"
SERVER_USER="root"
SERVER_PASSWORD="MasterJ123$"
SERVER_PATH="/var/www/crypto-dashboard"
```

**Features:**
- ✅ ตรวจสอบการเชื่อมต่อ server
- ✅ Backup ข้อมูลเดิม
- ✅ ส่งไฟล์ Backend, FrontendV2, FrontEnd
- ✅ ติดตั้ง dependencies
- ✅ Build frontend applications
- ✅ Restart services ด้วย PM2

### `deploy.bat` (Windows)

Script สำหรับ deploy application ลง server (Windows)

**Requirements:**
- PuTTY (plink, pscp) - ดาวน์โหลด: https://www.putty.org/

**Usage:**
```cmd
deploy.bat
```

**Configuration:**
แก้ไขตัวแปรใน script:
```batch
set SERVER_IP=172.105.118.30
set SERVER_USER=root
set SERVER_PASSWORD=MasterJ123$
set SERVER_PATH=/var/www/crypto-dashboard
```

## 🔧 Server Configuration

### PM2 Setup

บน server ต้องติดตั้ง PM2:
```bash
npm install -g pm2
```

### PM2 Commands

**ดูสถานะ:**
```bash
pm2 status
```

**ดู logs:**
```bash
pm2 logs
pm2 logs crypto-backend
```

**Restart service:**
```bash
pm2 restart crypto-backend
```

**Stop service:**
```bash
pm2 stop crypto-backend
```

**Delete service:**
```bash
pm2 delete crypto-backend
```

**Save PM2 configuration:**
```bash
pm2 save
pm2 startup
```

## 📁 Server Directory Structure

```
/var/www/crypto-dashboard/
├── BackEnd/
│   ├── node_modules/
│   ├── src/
│   ├── package.json
│   └── ...
├── FrontEndV2/
│   ├── dist/
│   ├── node_modules/
│   ├── src/
│   └── ...
├── FrontEnd/
│   ├── dist/
│   ├── node_modules/
│   └── ...
└── package.json
```

## 🔐 Security Notes

⚠️ **Warning:** Scripts เหล่านี้เก็บ password ใน plain text

**สำหรับ Production:**
1. ใช้ SSH keys แทน password
2. ใช้ environment variables
3. ใช้ secrets management tools

**Setup SSH Keys:**
```bash
# สร้าง SSH key (ถ้ายังไม่มี)
ssh-keygen -t rsa -b 4096

# Copy key ไปยัง server
ssh-copy-id root@172.105.118.30

# แก้ไข deploy.sh ให้ใช้ SSH key แทน password
# ลบ -pw และ sshpass
```

## 🛠️ Troubleshooting

### Connection Issues

**ตรวจสอบการเชื่อมต่อ:**
```bash
ssh root@172.105.118.30
```

**ตรวจสอบ firewall:**
```bash
# บน server
sudo ufw status
sudo ufw allow 22/tcp
```

### PM2 Issues

**PM2 ไม่ทำงาน:**
```bash
# ตรวจสอบ PM2
pm2 list
pm2 logs

# Reinstall PM2
npm install -g pm2
pm2 update
```

### Build Issues

**Frontend build ล้มเหลว:**
```bash
# บน server
cd /var/www/crypto-dashboard/FrontEndV2
rm -rf node_modules dist
npm install
npm run build
```

### Permission Issues

**แก้ไข permissions:**
```bash
# บน server
sudo chown -R root:root /var/www/crypto-dashboard
sudo chmod -R 755 /var/www/crypto-dashboard
```

## 📝 Workflow

### Typical Deployment Workflow

1. **Development:**
   ```bash
   # ทำการแก้ไข code
   # ทดสอบใน local
   ```

2. **Commit & Push:**
   ```bash
   ./git-push.sh
   ```

3. **Deploy:**
   ```bash
   ./deploy.sh
   ```

4. **Verify:**
   ```bash
   ssh root@172.105.118.30 'pm2 status'
   curl http://172.105.118.30:1111/api/health
   ```

## 🔄 Auto Deploy (Optional)

### GitHub Actions / GitLab CI

สามารถตั้งค่า auto deploy เมื่อ push code:

**Example GitHub Actions:**
```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          chmod +x deploy.sh
          ./deploy.sh
```

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ logs: `pm2 logs`
2. ตรวจสอบ server logs: `/var/www/crypto-dashboard/BackEnd/logs/`
3. ตรวจสอบ network connectivity
4. ตรวจสอบ PM2 status

