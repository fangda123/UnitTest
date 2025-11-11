#!/bin/bash

# Script สำหรับรัน Backend, FrontEndV2, และ FrontEnd พร้อมกันด้วย PM2
# Ports:
# - Backend: 1111
# - FrontEndV2: 1113
# - FrontEnd: 1112

# สีสำหรับ output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ฟังก์ชันสำหรับแสดงข้อความ
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

# ตรวจสอบว่ามี node_modules หรือไม่
check_dependencies() {
    print_info "กำลังตรวจสอบ dependencies..."
    
    if [ ! -d "BackEnd/node_modules" ]; then
        print_warning "BackEnd: ไม่พบ node_modules กำลังติดตั้ง..."
        cd BackEnd && npm install && cd ..
    fi
    
    if [ ! -d "FrontEndV2/node_modules" ]; then
        print_warning "FrontEndV2: ไม่พบ node_modules กำลังติดตั้ง..."
        cd FrontEndV2 && npm install && cd ..
    fi
    
    if [ ! -d "FrontEnd/node_modules" ]; then
        print_warning "FrontEnd: ไม่พบ node_modules กำลังติดตั้ง..."
        cd FrontEnd && npm install && cd ..
    fi
    
    print_success "Dependencies ครบถ้วนแล้ว"
}

# ตรวจสอบว่า PM2 ติดตั้งแล้วหรือยัง
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 ไม่ได้ติดตั้ง!"
        print_info "กำลังติดตั้ง PM2..."
        npm install -g pm2
        if [ $? -ne 0 ]; then
            print_error "ไม่สามารถติดตั้ง PM2 ได้ กรุณาติดตั้งด้วยตนเอง: npm install -g pm2"
            exit 1
        fi
        print_success "ติดตั้ง PM2 สำเร็จ"
    else
        print_success "PM2 พร้อมใช้งาน"
    fi
}

# ฟังก์ชันสำหรับหยุด services
stop_services() {
    print_info "กำลังหยุด services ด้วย PM2..."
    
    # หยุด PM2 processes
    pm2 stop ecosystem.config.js 2>/dev/null
    pm2 delete ecosystem.config.js 2>/dev/null
    
    # หยุด processes ที่ใช้ ports (backup)
    lsof -ti:1111 | xargs kill -9 2>/dev/null
    lsof -ti:1112 | xargs kill -9 2>/dev/null
    lsof -ti:1113 | xargs kill -9 2>/dev/null
    
    # ลบ PID files
    rm -f BackEnd/.pid
    rm -f FrontEndV2/.pid
    rm -f FrontEnd/.pid
    
    print_success "หยุด services ทั้งหมดแล้ว"
}

# ฟังก์ชันสำหรับรัน services ทั้งหมดด้วย PM2
start_services() {
    print_info "กำลังเริ่มต้น services ทั้งหมดด้วย PM2..."
    
    # เริ่มต้น services ด้วย PM2
    pm2 start ecosystem.config.js
    
    if [ $? -eq 0 ]; then
        print_success "Services เริ่มทำงานแล้วด้วย PM2"
        print_info "ใช้คำสั่งต่อไปนี้เพื่อจัดการ:"
        print_info "  - pm2 status          : ดูสถานะ"
        print_info "  - pm2 logs            : ดู logs ทั้งหมด"
        print_info "  - pm2 logs backend    : ดู logs Backend"
        print_info "  - pm2 logs frontendv2 : ดู logs FrontEndV2"
        print_info "  - pm2 logs frontend   : ดู logs FrontEnd"
        print_info "  - pm2 restart all     : รีสตาร์ททั้งหมด"
        print_info "  - pm2 stop all        : หยุดทั้งหมด"
        print_info "  - pm2 delete all      : ลบทั้งหมด"
    else
        print_error "ไม่สามารถเริ่มต้น services ได้"
        exit 1
    fi
}

# ฟังก์ชันสำหรับแสดงสถานะ
show_status() {
    echo ""
    print_info "═══════════════════════════════════════════════════════"
    print_success "🚀 Services เริ่มทำงานแล้วด้วย PM2!"
    print_info "═══════════════════════════════════════════════════════"
    echo ""
    
    # แสดงสถานะ PM2
    pm2 status
    
    echo ""
    print_info "📍 URLs:"
    echo -e "   ${GREEN}Backend:${NC}     http://localhost:1111"
    echo -e "   ${GREEN}Backend Docs:${NC} http://localhost:1111/api-docs"
    echo -e "   ${GREEN}FrontEndV2:${NC}   http://localhost:1113"
    echo -e "   ${GREEN}FrontEnd:${NC}     http://localhost:1112"
    echo ""
    print_info "📋 PM2 Commands:"
    echo -e "   ${BLUE}pm2 status${NC}          : ดูสถานะ"
    echo -e "   ${BLUE}pm2 logs${NC}            : ดู logs ทั้งหมด"
    echo -e "   ${BLUE}pm2 logs backend${NC}    : ดู logs Backend"
    echo -e "   ${BLUE}pm2 logs frontendv2${NC} : ดู logs FrontEndV2"
    echo -e "   ${BLUE}pm2 logs frontend${NC}   : ดู logs FrontEnd"
    echo -e "   ${BLUE}pm2 restart all${NC}     : รีสตาร์ททั้งหมด"
    echo -e "   ${BLUE}pm2 stop all${NC}        : หยุดทั้งหมด"
    echo -e "   ${BLUE}pm2 delete all${NC}      : ลบทั้งหมด"
    echo ""
    print_info "🛑 หยุด services: ./stop.sh หรือ pm2 stop all"
    print_info "═══════════════════════════════════════════════════════"
    echo ""
}

# Main function
main() {
    # สร้างโฟลเดอร์ logs ถ้ายังไม่มี
    mkdir -p logs
    
    # ตรวจสอบ PM2
    check_pm2
    
    # หยุด services เก่าก่อน (ถ้ามี)
    stop_services
    
    # ตรวจสอบ dependencies
    check_dependencies
    
    # รอสักครู่
    sleep 1
    
    # เริ่มต้น services ทั้งหมดด้วย PM2
    start_services
    
    # รอให้ services เริ่มทำงาน
    sleep 3
    
    # แสดงสถานะ
    show_status
    
    # แสดง logs แบบ real-time
    print_info "กำลังแสดง logs แบบ real-time (กด Ctrl+C เพื่อออก)..."
    sleep 2
    pm2 logs --lines 50
}

# รัน main function
main

