#!/bin/bash

# Script สำหรับรัน Backend, FrontEndV2, และ FrontEnd พร้อมกัน
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

# ฟังก์ชันสำหรับหยุด services
stop_services() {
    print_info "กำลังหยุด services..."
    
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
    
    # หยุด processes ที่ใช้ ports
    lsof -ti:1111 | xargs kill -9 2>/dev/null
    lsof -ti:1112 | xargs kill -9 2>/dev/null
    lsof -ti:1113 | xargs kill -9 2>/dev/null
    
    print_success "หยุด services ทั้งหมดแล้ว"
}

# ฟังก์ชันสำหรับรัน Backend
start_backend() {
    print_info "กำลังเริ่มต้น Backend (Port: 1111)..."
    cd BackEnd
    
    # รันใน background และบันทึก PID
    npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > .pid
    
    cd ..
    print_success "Backend เริ่มทำงานแล้ว (PID: $BACKEND_PID)"
    print_info "Logs: tail -f logs/backend.log"
}

# ฟังก์ชันสำหรับรัน FrontEndV2
start_frontendv2() {
    print_info "กำลังเริ่มต้น FrontEndV2 (Port: 1113)..."
    cd FrontEndV2
    
    # รันใน background และบันทึก PID
    npm run dev > ../logs/frontendv2.log 2>&1 &
    FRONTENDV2_PID=$!
    echo $FRONTENDV2_PID > .pid
    
    cd ..
    print_success "FrontEndV2 เริ่มทำงานแล้ว (PID: $FRONTENDV2_PID)"
    print_info "Logs: tail -f logs/frontendv2.log"
}

# ฟังก์ชันสำหรับรัน FrontEnd
start_frontend() {
    print_info "กำลังเริ่มต้น FrontEnd (Port: 1112)..."
    cd FrontEnd
    
    # รันใน background และบันทึก PID
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > .pid
    
    cd ..
    print_success "FrontEnd เริ่มทำงานแล้ว (PID: $FRONTEND_PID)"
    print_info "Logs: tail -f logs/frontend.log"
}

# ฟังก์ชันสำหรับแสดงสถานะ
show_status() {
    echo ""
    print_info "═══════════════════════════════════════════════════════"
    print_success "🚀 Services เริ่มทำงานแล้ว!"
    print_info "═══════════════════════════════════════════════════════"
    echo ""
    print_info "📍 URLs:"
    echo -e "   ${GREEN}Backend:${NC}     http://localhost:1111"
    echo -e "   ${GREEN}Backend Docs:${NC} http://localhost:1111/api-docs"
    echo -e "   ${GREEN}FrontEndV2:${NC}   http://localhost:1113"
    echo -e "   ${GREEN}FrontEnd:${NC}     http://localhost:1112"
    echo ""
    print_info "📋 Logs:"
    echo -e "   ${BLUE}Backend:${NC}     tail -f logs/backend.log"
    echo -e "   ${BLUE}FrontEndV2:${NC}   tail -f logs/frontendv2.log"
    echo -e "   ${BLUE}FrontEnd:${NC}     tail -f logs/frontend.log"
    echo ""
    print_info "🛑 หยุด services: ./stop.sh หรือ Ctrl+C"
    print_info "═══════════════════════════════════════════════════════"
    echo ""
}

# Main function
main() {
    # สร้างโฟลเดอร์ logs ถ้ายังไม่มี
    mkdir -p logs
    
    # หยุด services เก่าก่อน (ถ้ามี)
    stop_services
    
    # ตรวจสอบ dependencies
    check_dependencies
    
    # รอสักครู่
    sleep 1
    
    # เริ่มต้น services
    start_backend
    sleep 2
    
    start_frontendv2
    sleep 2
    
    start_frontend
    sleep 3
    
    # แสดงสถานะ
    show_status
    
    # รอให้ user กด Ctrl+C
    print_info "กด Ctrl+C เพื่อหยุด services..."
    
    # จัดการ signal สำหรับ graceful shutdown
    trap 'stop_services; exit 0' INT TERM
    
    # รอให้ processes ทำงาน
    wait
}

# รัน main function
main

