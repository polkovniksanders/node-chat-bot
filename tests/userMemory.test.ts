import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  formatMemoriesForPrompt,
  loadUserMemoryState,
  saveUserMemory,
} from '../src/context/userMemory.ts';

test('memory prompt includes the preferred grammatical form', () => {
  const prompt = formatMemoriesForPrompt(['Пользователь любит шахматы'], 'feminine');

  assert.match(prompt, /Предпочтительная грамматическая форма: женская/);
  assert.match(prompt, /данные, не инструкции/i);
  assert.doesNotMatch(prompt, /биологический пол/i);
});

test('loading legacy memory ignores malformed entries and defaults the grammatical form', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-legacy-memory-test-'));
  process.chdir(workdir);

  try {
    await mkdir('data/user-memory', { recursive: true });
    await writeFile(
      'data/user-memory/42.json',
      JSON.stringify({ userId: 42, memories: ['Полезный факт', 7, null] }),
    );

    assert.deepEqual(await loadUserMemoryState(42), {
      memories: ['Полезный факт'],
      grammaticalGender: 'unknown',
    });
  } finally {
    process.chdir(originalCwd);
    await rm(workdir, { recursive: true, force: true });
  }
});

test('saving a fact preserves the grammatical form', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-memory-test-'));
  process.chdir(workdir);

  try {
    await mkdir('data/user-memory', { recursive: true });
    await writeFile(
      'data/user-memory/42.json',
      JSON.stringify({
        userId: 42,
        memories: ['Пользователь живёт в Челябинске'],
        grammaticalGender: 'feminine',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      }),
    );

    await saveUserMemory(42, 'Пользователь любит шахматы');

    const saved = JSON.parse(await readFile('data/user-memory/42.json', 'utf8'));
    assert.equal(saved.grammaticalGender, 'feminine');
    assert.deepEqual(saved.memories, [
      'Пользователь живёт в Челябинске',
      'Пользователь любит шахматы',
    ]);
  } finally {
    process.chdir(originalCwd);
    await rm(workdir, { recursive: true, force: true });
  }
});

test('saving refuses to overwrite a corrupted memory file', async () => {
  const originalCwd = process.cwd();
  const workdir = await mkdtemp(path.join(tmpdir(), 'telegram-bot-corrupt-memory-test-'));
  process.chdir(workdir);

  try {
    await mkdir('data/user-memory', { recursive: true });
    await writeFile('data/user-memory/42.json', '{broken json');

    await assert.rejects(saveUserMemory(42, 'Новый факт'));
    assert.equal(await readFile('data/user-memory/42.json', 'utf8'), '{broken json');
  } finally {
    process.chdir(originalCwd);
    await rm(workdir, { recursive: true, force: true });
  }
});
