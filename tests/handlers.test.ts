import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('group reply includes the recent conversation from other participants', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-handlers-test-'));
  process.chdir(workdir);
  process.env.TELEGRAM_TOKEN = '123456:test-token';
  process.env.POLZA_API_KEY = 'test-key';

  const originalFetch = globalThis.fetch;
  const aiRequests: Array<{ messages?: Array<{ role: string; content: string }> }> = [];
  globalThis.fetch = async (_input, init) => {
    aiRequests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Тестовый ответ' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const [{ bot, initBotInfo }, { setupHandlers }, moduleConfig] = await Promise.all([
      import('../src/botInstance.ts'),
      import('../src/bot/handlers.ts'),
      import('../src/modules/moduleConfig.ts'),
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
            message_id: 2,
            date: 1,
            chat: { id: Number(payload.chat_id), type: 'group', title: 'Test group' },
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
    await moduleConfig.setEnabled(-1001, 'user-memory', false);

    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 1,
        chat: { id: -1001, type: 'group', title: 'Test group' },
        from: { id: 41, is_bot: false, first_name: 'Даша', username: 'dasha' },
        text: 'Даша — это я',
      },
    });

    await bot.handleUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        date: 2,
        chat: { id: -1001, type: 'group', title: 'Test group' },
        from: { id: 42, is_bot: false, first_name: 'Tester', username: 'tester' },
        text: '@test_bot привет',
        entities: [{ offset: 0, length: 9, type: 'mention' }],
      },
    });

    assert.equal(sentMessages.includes('Тестовый ответ'), true);
    assert.equal(
      aiRequests.some((request) =>
        request.messages?.some((message) => message.content === 'Даша: Даша — это я'),
      ),
      true,
      JSON.stringify(aiRequests),
    );

    aiRequests.length = 0;
    await bot.handleUpdate({
      update_id: 3,
      channel_post: {
        message_id: 3,
        date: 3,
        chat: { id: -1002, type: 'channel', title: 'Test channel' },
        text: '@test_bot новость',
        entities: [{ offset: 0, length: 9, type: 'mention' }],
      },
    });

    assert.equal(
      aiRequests.some((request) =>
        request.messages?.some((message) => message.content === 'Test channel: @test_bot новость'),
      ),
      true,
      JSON.stringify(aiRequests),
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(originalCwd);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await rm(workdir, { recursive: true, force: true });
  }
});
