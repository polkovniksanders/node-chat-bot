import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('chat registration lets the update reach later handlers', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-test-'));
  process.chdir(workdir);
  process.env.TELEGRAM_TOKEN = '123456:test-token';

  try {
    const [{ bot }, { setupModuleAdminHandler }, { getKnownChats }] = await Promise.all([
      import('../src/botInstance.ts'),
      import('../src/bot/moduleAdminHandler.ts'),
      import('../src/modules/knownChats.ts'),
    ]);

    bot.botInfo = {
      id: 123456,
      is_bot: true,
      first_name: 'Test bot',
      username: 'test_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    };

    setupModuleAdminHandler();
    let reached = false;
    bot.on('msg:text', () => {
      reached = true;
    });

    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 1,
        chat: { id: 42, type: 'private', first_name: 'Tester' },
        from: { id: 42, is_bot: false, first_name: 'Tester' },
        text: 'hello',
      },
    });

    assert.equal(
      getKnownChats().some((chat) => chat.id === '42'),
      true,
    );
    assert.equal(reached, true);
  } finally {
    process.chdir(originalCwd);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await rm(workdir, { recursive: true, force: true });
  }
});
