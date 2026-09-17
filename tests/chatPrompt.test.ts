import assert from 'node:assert/strict';
import test from 'node:test';

import { CHAT_BOT_PROMPT, buildGroupReplyPrompt } from '../src/config/prompts.ts';

test('private and group chat share the same conversation-first rules', () => {
  let groupPrompt = '';
  assert.doesNotThrow(() => {
    groupPrompt = buildGroupReplyPrompt();
  });

  for (const prompt of [CHAT_BOT_PROMPT, groupPrompt]) {
    assert.match(prompt, /сначала пойми смысл/i);
    assert.match(prompt, /лор.*второстепен/i);
    assert.match(prompt, /подстраивайся.*«ты».*«вы»/i);
    assert.doesNotMatch(prompt, /любой вопрос пропускай через котячью перспективу/i);
  }
});
