#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Timestamp for logs
timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

log_info() {
  echo -e "${BLUE}[$(timestamp)]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(timestamp)]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[$(timestamp)]${NC} $1"
}

log_error() {
  echo -e "${RED}[$(timestamp)]${NC} $1"
}

# Error handler
on_error() {
  log_error "Deployment failed at step: $1"
  log_error "Rolling back to previous state..."

  # Restore backup if exists
  if [ -d "dist.backup" ]; then
    rm -rf dist
    mv dist.backup dist
    log_warn "Restored previous build from backup"
  fi

  # Restart PM2 with old build
  if command -v pm2 &> /dev/null && [ -d "dist" ]; then
    pm2 startOrReload ecosystem.config.cjs --update-env 2>/dev/null || true
    log_warn "PM2 restarted with previous build"
  fi

  exit 1
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 0. Pre-flight checks
log_info "Running pre-flight checks..."

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  log_error "Node.js >= 20 is required. Current: $(node -v 2>/dev/null || echo 'not installed')"
  exit 1
fi
log_success "Node.js version: $(node -v)"

# Check PM2
if ! command -v pm2 &> /dev/null; then
  log_error "PM2 is not installed. Install with: npm install -g pm2"
  exit 1
fi
log_success "PM2 version: $(pm2 -v)"

# Check git
if ! command -v git &> /dev/null; then
  log_error "Git is not installed"
  exit 1
fi

# 1. Pull latest changes
log_info "Pulling latest code from origin/main..."
git fetch origin main || on_error "git fetch"
git reset --hard origin/main || on_error "git reset"

# 2. Load environment variables
log_info "Loading .env variables..."
if [ -f .env ]; then
  set -a
  source .env
  set +a
  log_success ".env loaded"
else
  log_error ".env file not found!"
  exit 1
fi

# Validate required env vars
REQUIRED_VARS=("TELEGRAM_TOKEN" "OPENROUTER_API_KEY" "CHANNEL_ID")
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    log_error "Required environment variable $var is not set"
    exit 1
  fi
done
log_success "Required environment variables validated"

# 3. Backup current build
if [ -d "dist" ]; then
  log_info "Backing up current build..."
  rm -rf dist.backup
  cp -r dist dist.backup
  log_success "Backup created: dist.backup"
fi

# 4. Clean old build
log_info "Cleaning old build..."
rm -rf dist

# 5. Install dependencies
log_info "Installing dependencies (dev included)..."
NODE_ENV=development npm ci || on_error "npm ci"
log_success "Dependencies installed"

# 6. Type check
log_info "Running type check..."
npm run typecheck || on_error "typecheck"
log_success "Type check passed"

# 7. Lint check (optional, non-blocking)
log_info "Running lint check..."
if npm run lint 2>/dev/null; then
  log_success "Lint check passed"
else
  log_warn "Lint check has warnings (non-blocking)"
fi

# 8. Build project
log_info "Building project..."
npm run build || on_error "build"
log_success "Build completed"

# 9. Remove dev dependencies
log_info "Removing dev dependencies..."
npm prune --omit=dev
log_success "Dev dependencies removed"

# 10. Restart PM2
log_info "Restarting PM2..."
pm2 startOrReload ecosystem.config.cjs --update-env || on_error "pm2 restart"
pm2 save
log_success "PM2 restarted and saved"

# 11. Health check
log_info "Running health check..."
sleep 3

PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"status":"online"' | head -1)
if [ -n "$PM2_STATUS" ]; then
  log_success "Health check passed - bot is online"
else
  log_warn "Bot may not be fully started yet, check logs"
fi

# 12. Cleanup backup on success
if [ -d "dist.backup" ]; then
  rm -rf dist.backup
  log_info "Backup cleaned up"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}    DEPLOYMENT COMPLETED${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

log_info "PM2 status:"
pm2 status

echo ""
log_info "Recent logs (last 20 lines):"
pm2 logs chat_bot --lines 20 --nostream
