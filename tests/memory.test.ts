import assert from 'node:assert/strict';
import test from 'node:test';

import { getGroupContext, pushToGroupContext } from '../src/context/memory.ts';

test('group context keeps only the latest 20 messages', () => {
  for (let index = 1; index <= 21; index += 1) {
    pushToGroupContext('limited-chat', 'user', `message ${index}`, index);
  }

  const context = getGroupContext('limited-chat', 21);
  assert.equal(context.length, 20);
  assert.equal(context[0]?.content, 'message 2');
  assert.equal(context.at(-1)?.content, 'message 21');
});

test('group context expires after one hour without activity', () => {
  pushToGroupContext('expired-chat', 'user', 'old message', 1);

  assert.deepEqual(getGroupContext('expired-chat', 60 * 60 * 1000 + 2), []);
});
