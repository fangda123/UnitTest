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

# Fetch และ pull remote changes ก่อน push
echo -e "\n${YELLOW}📥 กำลังดึงข้อมูลจาก remote repository...${NC}"
git fetch origin "$CURRENT_BRANCH" 2>/dev/null || git fetch origin

# ตรวจสอบว่ามี remote branch หรือไม่
if git rev-parse --verify "origin/$CURRENT_BRANCH" >/dev/null 2>&1; then
    # ตรวจสอบว่ามี remote changes หรือไม่
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse "origin/$CURRENT_BRANCH")
    BASE=$(git merge-base @ "origin/$CURRENT_BRANCH" 2>/dev/null || echo "")
    
    if [ -n "$BASE" ] && [ "$LOCAL" != "$REMOTE" ] && [ "$LOCAL" != "$BASE" ]; then
        echo -e "${YELLOW}⚠️  พบการเปลี่ยนแปลงใน remote repository${NC}"
        echo -e "${YELLOW}🔄 กำลัง pull และ merge...${NC}"
        
        if git pull origin "$CURRENT_BRANCH" --no-rebase; then
            echo -e "${GREEN}✅ Pull สำเร็จ!${NC}"
        else
            echo -e "${RED}❌ Pull ล้มเหลว - มี merge conflicts${NC}"
            echo -e "${YELLOW}💡 กรุณาแก้ไข conflicts แล้ว commit อีกครั้ง${NC}"
            exit 1
        fi
    elif [ -n "$BASE" ] && [ "$LOCAL" == "$BASE" ]; then
        echo -e "${YELLOW}⚠️  Local repository อยู่หลัง remote - กำลัง pull...${NC}"
        if git pull origin "$CURRENT_BRANCH" --no-rebase; then
            echo -e "${GREEN}✅ Pull สำเร็จ!${NC}"
        else
            echo -e "${RED}❌ Pull ล้มเหลว - มี merge conflicts${NC}"
            echo -e "${YELLOW}💡 กรุณาแก้ไข conflicts แล้ว commit อีกครั้ง${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Local repository อยู่ล่าสุดแล้ว${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  ไม่พบ remote branch - จะสร้าง branch ใหม่${NC}"
fi

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

