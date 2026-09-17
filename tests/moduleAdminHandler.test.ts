import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const originalCwd = process.cwd();
const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-test-'));
process.chdir(workdir);
process.env.TELEGRAM_TOKEN = '123456:test-token';
process.env.ADMIN_USER_ID = '42';

const [{ bot }, { setupModuleAdminHandler }, { getKnownChats }, moduleConfig] = await Promise.all([
  import('../src/botInstance.ts'),
  import('../src/bot/moduleAdminHandler.ts'),
  import('../src/modules/knownChats.ts'),
  import('../src/modules/moduleConfig.ts'),
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
bot.api.config.use(async () => ({ ok: true, result: true }));
setupModuleAdminHandler();

after(async () => {
  process.chdir(originalCwd);
  await new Promise((resolve) => setTimeout(resolve, 25));
  await rm(workdir, { recursive: true, force: true });
});

test('chat registration lets the update reach later handlers', async () => {
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
});

test('cron module button adds the selected chat to the cron targets', async () => {
  const chatId = '-5349205440';
  assert.equal(moduleConfig.getStatus(chatId)['daily-news'].enabled, false);

  await bot.handleUpdate({
    update_id: 2,
    callback_query: {
      id: 'callback-1',
      chat_instance: 'test',
      from: { id: 42, is_bot: false, first_name: 'Admin' },
      data: `mod:toggle:${chatId}:daily-news`,
      message: {
        message_id: 2,
        date: 1,
        chat: { id: 42, type: 'private', first_name: 'Admin' },
        from: { id: 123456, is_bot: true, first_name: 'Test bot', username: 'test_bot' },
        text: 'modules',
      },
    },
  });

  assert.equal(moduleConfig.getStatus(chatId)['daily-news'].enabled, true);
  assert.deepEqual(moduleConfig.getEnabledChatsForModule('daily-news'), [chatId]);
});
