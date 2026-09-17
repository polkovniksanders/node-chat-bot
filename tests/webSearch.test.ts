import assert from 'node:assert/strict';
import test from 'node:test';

test('only current-information questions use Polza web search and return sources', async () => {
  process.env.POLZA_API_KEY = 'test-key';

  const originalFetch = globalThis.fetch;
  const requestBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_input, init) => {
    requestBodies.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: 'Сегодня именины отмечают Александр и Василий.',
              annotations: [
                {
                  type: 'url_citation',
                  url_citation: { url: 'https://example.com/namedays', title: 'Именины' },
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const { generateReply } = await import('../src/ai/generateReply.ts');
    const reply = await generateReply('web-search-test', 42, 'У кого сегодня именины?', {
      skipMemory: true,
    });

    assert.deepEqual(requestBodies[0].plugins, [{ id: 'web', max_results: 3 }]);
    assert.match(reply, /Источники:\nhttps:\/\/example\.com\/namedays/);

    await generateReply('ordinary-chat-test', 42, 'Расскажи короткую шутку', {
      skipMemory: true,
    });
    assert.equal('plugins' in requestBodies[1], false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
