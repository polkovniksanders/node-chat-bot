---
name: Deployment method for node-chat-bot
description: How to deploy changes to the Beget VPS — PM2 + TypeScript build via deploy.sh
type: project
---

The server runs the bot via **PM2** (process name: `chat_bot`, id: 0) using a compiled TypeScript build at `dist/index.js`. There is no Docker involved for this service at present.

**Deploy flow:**
1. Commit changes locally and `git push origin main`
2. SSH to server: `ssh -i ~/.ssh/github_actions_vps -o StrictHostKeyChecking=no root@155.212.131.33`
3. `cd ~/chat_bot && bash deploy.sh`

`deploy.sh` does:
- `git reset --hard origin/main`
- `npm ci` (dev deps included)
- `tsc --noEmit` (type check, blocking)
- `eslint src` (lint, non-blocking)
- `npm run build` (tsc + tsc-alias → dist/)
- `npm prune --omit=dev`
- `pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save`

**Why:** Server (1 CPU, 1GB RAM) is too weak to build Docker images. PM2 + prebuilt TypeScript is the current strategy.

**How to apply:** Never try to `docker build` on this server. Always go through the git push → deploy.sh path.

**Notes:**
- Lint errors are non-blocking (warnings only in deploy.sh) — pre-existing prettier errors throughout the codebase are ignored.
- A second PM2 process `hots-notify` (id: 1) also runs on the server — do not touch it.
- After a reload there is a brief 409 Conflict on `getUpdates` in the error log — this is normal and resolves on its own as the old process dies.
