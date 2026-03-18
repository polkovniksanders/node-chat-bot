---
name: SSH access to Beget VPS
description: Correct SSH key and connection command for root@155.212.131.33
type: reference
---

Use `~/.ssh/github_actions_vps` to connect to the Beget VPS.

Correct command:
```
ssh -i ~/.ssh/github_actions_vps -o StrictHostKeyChecking=no root@155.212.131.33
```

Keys that do NOT work: `id_ed25519`

**Why:** The VPS was provisioned with the `github_actions_vps` key, not the default `id_ed25519`.
