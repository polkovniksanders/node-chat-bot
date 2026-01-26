#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Starting PRODUCTION deployment...${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. Подтягиваем последние изменения
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git reset --hard HEAD
git pull origin main

# 2. Загружаем .env в окружение текущей сессии
echo -e "${YELLOW}🔐 Loading .env variables...${NC}"
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo -e "${RED}❌ .env file not found!${NC}"
  exit 1
fi

# 3. Удаляем старую сборку
echo -e "${YELLOW}🧹 Cleaning old build...${NC}"
rm -rf dist

# 4. Устанавливаем зависимости (включая dev)
echo -e "${YELLOW}📦 Installing dependencies (dev included)...${NC}"
NODE_ENV=development npm ci

# 5. Проверяем типы
echo -e "${YELLOW}🔍 Type checking...${NC}"
npm run typecheck || {
  echo -e "${RED}❌ Type check failed! Aborting.${NC}"
  exit 1
}

# 6. Сборка проекта
echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build

# 7. Удаляем dev-зависимости
echo -e "${YELLOW}🗑️  Removing dev dependencies...${NC}"
npm prune --omit=dev

# 8. Перезапуск PM2 с ecosystem.config.js
echo -e "${YELLOW}🚀 Restarting PM2 (production)...${NC}"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# 9. Готово
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${BLUE}📱 PM2 status:${NC}"
pm2 status

echo -e "${BLUE}📋 Recent logs:${NC}"
pm2 logs node_chat_bot --lines
