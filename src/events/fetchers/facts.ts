import { generateContent } from '@/ai/generateContent.js';
import { API_URLS, TIMEOUT_SHORT, TIMEOUT_MEDIUM } from '@/config/api.js';
import { INTERESTING_WORDS } from '@/config/constants.js';
import {
  TRANSLATE_SYSTEM_PROMPT,
  CAT_FACT_TRANSLATE_HINT,
  DOG_FACT_TRANSLATE_HINT,
  USELESS_FACT_TRANSLATE_HINT,
  WORD_TRANSLATE_HINT,
} from '@/config/prompts.js';
import type { WordMeaning } from '@/types/index.js';

async function translateText(text: string, hint = ''): Promise<string> {
  try {
    const systemPrompt = hint ? `${TRANSLATE_SYSTEM_PROMPT} ${hint}` : TRANSLATE_SYSTEM_PROMPT;
    const result = await generateContent(systemPrompt, text);
    return result.trim() || text;
  } catch {
    return text;
  }
}

export async function fetchCatFact(): Promise<string | null> {
  try {
    const res = await fetch(API_URLS.CAT_FACT, { signal: AbortSignal.timeout(TIMEOUT_MEDIUM) });
    if (!res.ok) return null;
    const data = (await res.json()) as { fact: string };
    if (!data.fact) return null;
    return await translateText(data.fact, CAT_FACT_TRANSLATE_HINT);
  } catch {
    return null;
  }
}

export async function fetchDogFact(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URLS.DOG_FACT}?limit=1`, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: Array<{ attributes: { body: string } }> };
    const fact = data.data?.[0]?.attributes?.body;
    if (!fact) return null;
    return await translateText(fact, DOG_FACT_TRANSLATE_HINT);
  } catch {
    return null;
  }
}

export async function fetchWordMeaning(): Promise<WordMeaning | null> {
  const word = INTERESTING_WORDS[Math.floor(Math.random() * INTERESTING_WORDS.length)];
  try {
    const res = await fetch(`${API_URLS.DICTIONARY}/${word}`, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any[];
    const definition = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    if (!definition) return null;
    const [wordRu, meaning] = await Promise.all([
      translateText(word, WORD_TRANSLATE_HINT),
      translateText(definition),
    ]);
    return { word, wordRu, meaning };
  } catch {
    return null;
  }
}

export async function fetchUselessFact(): Promise<string | null> {
  try {
    const res = await fetch(API_URLS.USELESS_FACTS, {
      signal: AbortSignal.timeout(TIMEOUT_SHORT),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text: string };
    if (!data.text) return null;
    return await translateText(data.text, USELESS_FACT_TRANSLATE_HINT);
  } catch {
    return null;
  }
}