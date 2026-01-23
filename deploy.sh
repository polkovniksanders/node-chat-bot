#!/bin/bash

# Останавливаем выполнение при любой ошибке
set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Starting deployment...${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. Получаем последние изменения
echo -e "${YELLOW}📥 Step 1/7: Pulling latest code from GitHub...${NC}"
git reset --hard HEAD
git pull origin main  # Или master, если у вас main ветка называется master

# 2. Очищаем старую сборку
echo -e "${YELLOW}🧹 Step 2/7: Cleaning old build...${NC}"
rm -rf dist

# 3. Устанавливаем зависимости (включая dev для сборки)
echo -e "${YELLOW}📦 Step 3/7: Installing dependencies...${NC}"
npm ci

# 4. Проверяем типы (опционально, но рекомендуется)
echo -e "${YELLOW}🔍 Step 4/7: Type checking...${NC}"
npm run typecheck || {
  echo -e "${RED}❌ Type check failed! Aborting deployment.${NC}"
  exit 1
}

# 5. Собираем проект
echo -e "${YELLOW}🔨 Step 5/7: Building project...${NC}"
npm run build

# 6. Удаляем dev-зависимости (экономим ~150MB)
echo -e "${YELLOW}🗑️  Step 6/7: Removing dev dependencies...${NC}"
npm prune --omit=dev

# 7. Перезапускаем PM2
echo -e "${YELLOW}🚀 Step 7/7: Restarting application...${NC}"
pm2 restart node_chat_bot --update-env

# Показываем статистику
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${BLUE}📊 Bundle size:${NC}"
du -sh dist/
ls -lh dist/

echo -e "${BLUE}💾 node_modules size:${NC}"
du -sh node_modules/

echo -e "${BLUE}📱 PM2 status:${NC}"
pm2 status

echo -e "${BLUE}📋 Recent logs:${NC}"
pm2 logs node_chat_bot --lines 20 --nostream