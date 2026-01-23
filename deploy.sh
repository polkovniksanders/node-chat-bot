#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Starting deployment...${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${YELLOW}📥 Step 1/8: Pulling latest code from GitHub...${NC}"
git reset --hard HEAD
git pull origin main

echo -e "${YELLOW}🔑 Step 2/8: Loading environment variables...${NC}"
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✅ .env loaded${NC}"
else
  echo -e "${RED}❌ .env file not found! Aborting.${NC}"
  exit 1
fi

echo -e "${YELLOW}🧹 Step 3/8: Cleaning old build...${NC}"
rm -rf dist

echo -e "${YELLOW}📦 Step 4/8: Installing dependencies...${NC}"
npm ci

echo -e "${YELLOW}🔍 Step 5/8: Type checking...${NC}"
npm run typecheck || {
  echo -e "${RED}❌ Type check failed! Aborting deployment.${NC}"
  exit 1
}

echo -e "${YELLOW}🔨 Step 6/8: Building project...${NC}"
npm run build

echo -e "${YELLOW}🗑️  Step 7/8: Removing dev dependencies...${NC}"
npm prune --omit=dev

echo -e "${YELLOW}🚀 Step 8/8: Restarting application with PM2...${NC}"
pm2 start $(pwd)/dist/index.js --name node_chat_bot --update-env || \
pm2 restart node_chat_bot --update-env

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