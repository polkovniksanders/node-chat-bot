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
echo -e "${YELLOW}📥 Step 1/8: Pulling latest code from GitHub...${NC}"
git reset --hard HEAD
git pull origin main  # Или master, если ваша ветка master

# 2. Подгружаем переменные окружения
echo -e "${YELLOW}🔑 Step 2/8: Loading environment variables...${NC}"
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✅ .env loaded${NC}"
else
  echo -e "${RED}❌ .env file not found! Aborting.${NC}"
  exit 1
fi

# 3. Очищаем старую сборку
echo -e "${YELLOW}🧹 Step 3/8: Cleaning old build...${NC}"
rm -rf dist

# 4. Устанавливаем зависимости (включая dev для сборки)
echo -e "${YELLOW}📦 Step 4/8: Installing dependencies...${NC}"
npm ci

# 5. Проверяем типы (опционально, но рекомендуется)
echo -e "${YELLOW}🔍 Step 5/8: Type checking...${NC}"
npx tsc --noEmit || {
  echo -e "${RED}❌ Type check failed! Aborting deployment.${NC}"
  exit 1
}

# 6. Собираем проект
echo -e "${YELLOW}🔨 Step 6/8: Building project...${NC}"
npm run build

# 7. Удаляем dev-зависимости (экономим место)
echo -e "${YELLOW}🗑️  Step 7/8: Removing dev dependencies...${NC}"
npm prune --omit=dev

# 8. Перезапускаем PM2 с абсолютным путём и обновлённым env
echo -e "${YELLOW}🚀 Step 8/8: Restarting application with PM2...${NC}"
pm2 start $(pwd)/dist/index.js --name node_chat_bot --update-env || \
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