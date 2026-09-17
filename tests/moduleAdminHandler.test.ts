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

const botStatuses = new Map<string, 'member' | 'administrator'>([['-5349205440', 'administrator']]);
const apiCalls: Array<{ method: string; payload: Record<string, unknown> }> = [];

bot.api.config.use(async (_prev, method, payload) => {
  apiCalls.push({ method, payload });
  if (method === 'getChatMember') {
    return {
      ok: true,
      result: {
        user: bot.botInfo,
        status: botStatuses.get(String(payload.chat_id)) ?? 'member',
      },
    };
  }
  if (method === 'sendMessage') {
    return {
      ok: true,
      result: {
        message_id: 99,
        date: 1,
        chat: { id: Number(payload.chat_id), type: 'private', first_name: 'Admin' },
        text: payload.text,
      },
    };
  }
  return { ok: true, result: true };
});
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

test('/modules only lists groups where the bot is an administrator', async () => {
  await bot.handleUpdate({
    update_id: 2,
    message: {
      message_id: 2,
      date: 1,
      chat: { id: -5349205440, type: 'group', title: 'Admin group' },
      from: { id: 42, is_bot: false, first_name: 'Admin' },
      text: 'hello',
    },
  });

  apiCalls.length = 0;
  await bot.handleUpdate({
    update_id: 3,
    message: {
      message_id: 3,
      date: 1,
      chat: { id: 42, type: 'private', first_name: 'Admin' },
      from: { id: 42, is_bot: false, first_name: 'Admin' },
      text: '/modules',
      entities: [{ offset: 0, length: 8, type: 'bot_command' }],
    },
  });

  const reply = apiCalls.find((call) => call.method === 'sendMessage');
  const keyboard = reply?.payload.reply_markup as {
    inline_keyboard: Array<Array<{ text: string }>>;
  };
  assert.deepEqual(
    keyboard.inline_keyboard.flat().map((button) => button.text),
    ['Admin group (-5349205440)'],
  );
});

test('cron module button adds the selected chat to the cron targets', async () => {
  const chatId = '-5349205440';
  assert.equal(moduleConfig.getStatus(chatId)['daily-news'].enabled, false);

  await bot.handleUpdate({
    update_id: 4,
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

test('module button rejects a chat where the bot is not an administrator', async () => {
  const chatId = '-999';

  await bot.handleUpdate({
    update_id: 5,
    callback_query: {
      id: 'callback-2',
      chat_instance: 'test',
      from: { id: 42, is_bot: false, first_name: 'Admin' },
      data: `mod:toggle:${chatId}:daily-news`,
      message: {
        message_id: 4,
        date: 1,
        chat: { id: 42, type: 'private', first_name: 'Admin' },
        from: { id: 123456, is_bot: true, first_name: 'Test bot', username: 'test_bot' },
        text: 'modules',
      },
    },
  });

  assert.equal(moduleConfig.getStatus(chatId)['daily-news'].enabled, false);
});
