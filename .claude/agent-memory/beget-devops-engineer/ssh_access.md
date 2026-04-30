---
name: SSH access to Beget VPS
description: Correct SSH key and connection command for root@155.212.131.33
type: reference
---

SSH access is currently broken as of 2026-04-30. All locally available keys were tried and denied:
- `github_actions_vps` (previously recorded as working — no longer works)
- `ai_generator_deploy`, `id_ed25519`, `taxi_deploy`, `wanda_backend`, `wanda_frontend`
- SSH agent key (SHA256:V3tmad6TaIA113vEs7oclxG/OgfUH9ymbq+4qb2PSw4, ircware@gmail.com)

Server only accepts `publickey` auth (no password). To restore access, use the Beget VPS web console at beget.com to add the correct public key to `/root/.ssh/authorized_keys`.

Once working, update this file with the correct key name.
