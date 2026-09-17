import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('private memory commands show and delete the user data without AI calls', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-memory-commands-test-'));
  process.chdir(workdir);
  process.env.TELEGRAM_TOKEN = '123456:test-token';
  process.env.POLZA_API_KEY = 'test-key';

  await mkdir('data/user-memory', { recursive: true });
  await mkdir('data/user-profiles', { recursive: true });
  await writeFile(
    'data/user-memory/42.json',
    JSON.stringify({
      userId: 42,
      memories: ['Пользователь любит шахматы'],
      grammaticalGender: 'feminine',
      lastUpdated: '2026-01-01T00:00:00.000Z',
    }),
  );
  await writeFile('data/user-profiles/42.json', JSON.stringify({ userId: 42 }));

  const originalFetch = globalThis.fetch;
  let aiCalls = 0;
  globalThis.fetch = async () => {
    aiCalls += 1;
    throw new Error('Memory commands must not call AI');
  };

  try {
    const [{ bot, initBotInfo }, { setupHandlers }, memory] = await Promise.all([
      import('../src/botInstance.ts'),
      import('../src/bot/handlers.ts'),
      import('../src/context/memory.ts'),
    ]);
    const sentMessages: string[] = [];
    bot.api.config.use(async (_prev, method, payload) => {
      if (method === 'getMe') {
        return {
          ok: true,
          result: {
            id: 123456,
            is_bot: true,
            first_name: 'Test bot',
            username: 'test_bot',
            can_join_groups: true,
            can_read_all_group_messages: true,
            supports_inline_queries: false,
            can_connect_to_business: false,
            has_main_web_app: false,
          },
        };
      }
      if (method === 'sendMessage') {
        sentMessages.push(String(payload.text));
        return {
          ok: true,
          result: {
            message_id: sentMessages.length + 1,
            date: 1,
            chat: { id: 42, type: 'private', first_name: 'Tester' },
            text: payload.text,
          },
        };
      }
      return { ok: true, result: true };
    });
    await initBotInfo();
    bot.botInfo = {
      id: 123456,
      is_bot: true,
      first_name: 'Test bot',
      username: 'test_bot',
      can_join_groups: true,
      can_read_all_group_messages: true,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    };
    setupHandlers(bot);
    memory.pushToContext(42, 42, 'user', 'Старый разговор');

    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 1,
        chat: { id: 42, type: 'private', first_name: 'Tester' },
        from: { id: 42, is_bot: false, first_name: 'Tester' },
        text: 'Что ты обо мне помнишь?',
      },
    });

    assert.match(sentMessages.at(-1) ?? '', /Пользователь любит шахматы/);
    assert.match(sentMessages.at(-1) ?? '', /женская/);

    await bot.handleUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        date: 2,
        chat: { id: 42, type: 'private', first_name: 'Tester' },
        from: { id: 42, is_bot: false, first_name: 'Tester' },
        text: 'Забудь всё обо мне',
      },
    });

    await assert.rejects(access('data/user-memory/42.json'));
    await assert.rejects(access('data/user-profiles/42.json'));
    assert.deepEqual(memory.getUserContext(42, 42), []);
    assert.equal(aiCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(originalCwd);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await rm(workdir, { recursive: true, force: true });
  }
});
