#!/bin/bash

# Git Push Script
# Script สำหรับ push code ขึ้น Git repository

set -e

# สีสำหรับ output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 เริ่มต้น Git Push Process...${NC}\n"

# ตรวจสอบว่าเป็น git repository หรือไม่
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ ไม่พบ .git directory - ไม่ใช่ git repository${NC}"
    exit 1
fi

# ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  ไม่มีการเปลี่ยนแปลงใดๆ${NC}"
    read -p "ต้องการ push ไปยัง remote repository หรือไม่? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# แสดงสถานะปัจจุบัน
echo -e "${YELLOW}📊 Git Status:${NC}"
git status --short

# เพิ่มไฟล์ทั้งหมด
echo -e "\n${GREEN}📦 เพิ่มไฟล์ทั้งหมด...${NC}"
git add .

# Commit (ถาม message)
echo -e "\n${YELLOW}💬 กรุณาใส่ commit message:${NC}"
read -r COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${YELLOW}⚠️  ใช้ default message: ${COMMIT_MESSAGE}${NC}"
fi

git commit -m "$COMMIT_MESSAGE"

# ตรวจสอบ remote branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "\n${GREEN}🌿 Current Branch: ${CURRENT_BRANCH}${NC}"

# Push ไปยัง remote
echo -e "\n${GREEN}📤 Push ไปยัง remote repository...${NC}"
if git push origin "$CURRENT_BRANCH"; then
    echo -e "\n${GREEN}✅ Push สำเร็จ!${NC}"
    echo -e "${GREEN}📋 Branch: ${CURRENT_BRANCH}${NC}"
else
    echo -e "\n${RED}❌ Push ล้มเหลว!${NC}"
    echo -e "${YELLOW}💡 ลองใช้: git push -u origin ${CURRENT_BRANCH}${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 เสร็จสิ้น!${NC}"

