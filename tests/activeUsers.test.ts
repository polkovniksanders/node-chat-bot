import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getActiveRegisteredUsers, registerActiveUser } from '../src/modules/activeUsers.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

test('active users filter by chat and 7 days', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-active-users-test-'));
  process.chdir(workdir);

  try {
    await mkdir('data', { recursive: true });
    await writeFile('data/active-users.json', JSON.stringify({}), 'utf-8');

    const now = Date.now();
    registerActiveUser('chat-a', 942510836, now - DAY_MS * 2); // ok
    registerActiveUser('chat-a', 5492444, now - DAY_MS * 8); // too old
    registerActiveUser('chat-b', 388280667, now - DAY_MS * 1); // other chat

    const chatA = getActiveRegisteredUsers('chat-a', 7, now).map((u) => u.id);
    const chatB = getActiveRegisteredUsers('chat-b', 7, now).map((u) => u.id);

    assert.deepEqual(chatA, [942510836]);
    assert.deepEqual(chatB, [388280667]);

  } finally {
    process.chdir(originalCwd);
    await rm(workdir, { recursive: true, force: true });
  }
});
