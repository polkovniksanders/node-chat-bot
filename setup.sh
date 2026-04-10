#!/bin/bash
set -e

# ── Configuration ──────────────────────────────────────────────────────────────
REPO_URL="https://github.com/polkovniksanders/node-chat-bot.git"
APP_DIR="/apps/chat_bot"
NODE_MAJOR=22   # LTS версия Node.js
# ──────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log_info()    { echo -e "${BLUE}[$(timestamp)]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(timestamp)]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[$(timestamp)]${NC} $1"; }
log_error()   { echo -e "${RED}[$(timestamp)]${NC} $1"; }

if [ "$(id -u)" -ne 0 ]; then
  log_error "Run as root: sudo bash setup.sh"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    INITIAL SERVER SETUP${NC}"
echo -e "${BLUE}    Target: $APP_DIR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. System packages
log_info "Updating system packages..."
apt-get update -qq
apt-get install -y -qq curl git python3 build-essential
log_success "System packages ready"

# 2. Node.js via NodeSource
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt "$NODE_MAJOR" ]; then
  log_info "Installing Node.js $NODE_MAJOR..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  log_success "Node.js installed: $(node -v)"
else
  log_success "Node.js already installed: $(node -v)"
fi

# 3. PM2
if ! command -v pm2 &> /dev/null; then
  log_info "Installing PM2..."
  npm install -g pm2
  log_success "PM2 installed: $(pm2 -v)"
else
  log_success "PM2 already installed: $(pm2 -v)"
fi

# 4. Create app directory structure
log_info "Creating app directory $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data"
log_success "Directory structure created"

# 5. Clone repository
if [ -d "$APP_DIR/.git" ]; then
  log_warn "Repository already cloned, skipping git clone"
else
  log_info "Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  log_success "Repository cloned"
fi

# 6. .env reminder
echo ""
log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_warn "  ACTION REQUIRED: create .env file before deploying"
log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  nano $APP_DIR/.env"
echo ""
echo "  Required variables:"
echo "    TELEGRAM_TOKEN=..."
echo "    CHANNEL_ID=..."
echo "    EVENTS_CHANNEL_ID=..."
echo ""
echo "  Optional (AI providers, at least one needed):"
echo "    GPTUNNEL_API_KEY=..."
echo "    ANTHROPIC_API_KEY=..."
echo "    OPENAI_API_KEY=..."
echo "    GEMINI_API_KEY=..."
echo "    GROQ_API_KEY=..."
echo "    HF_TOKEN=..."
echo "    DEEPSEEK_API_KEY=..."
echo "    OPENWEATHERMAP_API_KEY=..."
echo "    GEONAMES_USERNAME=..."
echo ""

# 7. PM2 startup
log_info "Configuring PM2 startup on boot..."
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
log_success "PM2 startup configured"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}    SETUP COMPLETED${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
log_info "Next steps:"
echo "  1. Create .env:  nano $APP_DIR/.env"
echo "  2. Deploy:       cd $APP_DIR && bash deploy.sh"
echo ""
