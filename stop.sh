#!/bin/bash

# Script สำหรับหยุด Backend, FrontEndV2, และ FrontEnd ด้วย PM2

# สีสำหรับ output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ตรวจสอบว่า PM2 ติดตั้งแล้วหรือยัง
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 ไม่ได้ติดตั้ง - กำลังหยุด processes แบบเดิม..."
    
    # หยุด Backend
    if [ -f "BackEnd/.pid" ]; then
        PID=$(cat BackEnd/.pid)
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID 2>/dev/null
            print_success "หยุด Backend (PID: $PID)"
        fi
        rm -f BackEnd/.pid
    fi
    
    # หยุด FrontEndV2
    if [ -f "FrontEndV2/.pid" ]; then
        PID=$(cat FrontEndV2/.pid)
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID 2>/dev/null
            print_success "หยุด FrontEndV2 (PID: $PID)"
        fi
        rm -f FrontEndV2/.pid
    fi
    
    # หยุด FrontEnd
    if [ -f "FrontEnd/.pid" ]; then
        PID=$(cat FrontEnd/.pid)
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID 2>/dev/null
            print_success "หยุด FrontEnd (PID: $PID)"
        fi
        rm -f FrontEnd/.pid
    fi
else
    print_info "กำลังหยุด services ด้วย PM2..."
    
    # หยุด PM2 processes
    pm2 stop ecosystem.config.js 2>/dev/null
    pm2 delete ecosystem.config.js 2>/dev/null
    
    print_success "หยุด PM2 processes แล้ว"
fi

# หยุด processes ที่ใช้ ports (backup - สำหรับกรณีที่ PM2 ไม่ทำงาน)
print_info "กำลังตรวจสอบ ports..."

if lsof -ti:1111 > /dev/null 2>&1; then
    lsof -ti:1111 | xargs kill -9 2>/dev/null
    print_success "ปิด port 1111 (Backend)"
fi

if lsof -ti:1112 > /dev/null 2>&1; then
    lsof -ti:1112 | xargs kill -9 2>/dev/null
    print_success "ปิด port 1112 (FrontEnd)"
fi

if lsof -ti:1113 > /dev/null 2>&1; then
    lsof -ti:1113 | xargs kill -9 2>/dev/null
    print_success "ปิด port 1113 (FrontEndV2)"
fi

# ลบ PID files
rm -f BackEnd/.pid
rm -f FrontEndV2/.pid
rm -f FrontEnd/.pid

print_success "หยุด services ทั้งหมดแล้ว"
