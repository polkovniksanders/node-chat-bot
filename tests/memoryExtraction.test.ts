import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('automatic extraction saves a durable fact and evidenced grammatical form once', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-extraction-test-'));
  process.chdir(workdir);
  process.env.POLZA_API_KEY = 'test-key';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                facts: ['Пользователь любит шахматы'],
                grammaticalGender: 'feminine',
                genderEvidence: 'Я женщина',
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const [{ extractAndSaveFact }, { loadUserMemoryState }] = await Promise.all([
      import('../src/ai/generateReply.ts'),
      import('../src/context/userMemory.ts'),
    ]);

    assert.equal(await extractAndSaveFact(42, 'Я женщина и люблю шахматы.'), true);
    assert.equal(await extractAndSaveFact(42, 'Я женщина и люблю шахматы.'), false);

    assert.deepEqual(await loadUserMemoryState(42), {
      memories: ['Пользователь любит шахматы'],
      grammaticalGender: 'feminine',
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(originalCwd);
    await rm(workdir, { recursive: true, force: true });
  }
});
