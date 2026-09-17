import { polzaChatSmart } from '@/ai/polza.js';
import {
  getGroupContext,
  getUserContext,
  pushToContext,
  pushToGroupContext,
} from '@/context/memory.js';
import {
  formatMemoriesForPrompt,
  loadUserMemoryState,
  updateUserMemory,
  type GrammaticalGender,
} from '@/context/userMemory.js';
import {
  CHAT_BOT_PROMPT,
  buildGroupReplyPrompt,
  PASSIVE_EXTRACTION_PROMPT,
} from '@/config/prompts.js';

interface GenerateReplyOptions {
  extraSystemContext?: string;
  skipMemory?: boolean;
  isGroupReply?: boolean;
}

export async function generateReply(
  chatId: number | string,
  userId: number,
  userMessage: string,
  options?: GenerateReplyOptions,
): Promise<string> {
  let history;
  if (options?.isGroupReply) {
    history = getGroupContext(chatId);
  } else {
    pushToContext(chatId, userId, 'user', userMessage);
    history = getUserContext(chatId, userId);
  }

  // Build system prompt: extraContext + persistent memories + base persona
  let systemPrompt = '';

  if (options?.isGroupReply) {
    const memory = options?.skipMemory
      ? { memories: [], grammaticalGender: 'unknown' as const }
      : await loadUserMemoryState(userId);

    if (options?.extraSystemContext) systemPrompt += options.extraSystemContext;
    systemPrompt += buildGroupReplyPrompt();

    const memBlock = formatMemoriesForPrompt(memory.memories, memory.grammaticalGender);
    if (memBlock) systemPrompt += '\n\n' + memBlock;
  } else {
    if (options?.extraSystemContext) {
      systemPrompt += options.extraSystemContext;
    }
    if (!options?.skipMemory) {
      const memory = await loadUserMemoryState(userId);
      const memBlock = formatMemoriesForPrompt(memory.memories, memory.grammaticalGender);
      if (memBlock) systemPrompt += memBlock + '\n\n';
    }
    systemPrompt += CHAT_BOT_PROMPT;
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
  ];

  let answer = '';
  try {
    answer = (await polzaChatSmart(messages)).trim();
  } catch (err) {
    console.error('[generateReply] Polza error:', err);
  }

  if (!answer) {
    return 'Не понял, повтори.';
  }

  if (options?.isGroupReply) {
    pushToGroupContext(chatId, 'assistant', answer);
  } else {
    pushToContext(chatId, userId, 'assistant', answer);
  }
  return answer;
}

const MEMORY_TRIGGER = /запомни|remember|не забудь|сохрани/i;

export function isExplicitMemoryRequest(text: string): boolean {
  return MEMORY_TRIGGER.test(text);
}

export async function extractAndSaveFact(userId: number, userText: string): Promise<boolean> {
  if (userText.trim().length < 10) return false;

  try {
    const response = await polzaChatSmart([
      { role: 'system', content: PASSIVE_EXTRACTION_PROMPT },
      { role: 'user', content: userText },
    ]);

    const parsed = JSON.parse(response.trim()) as {
      facts?: unknown;
      grammaticalGender?: unknown;
      genderEvidence?: unknown;
    };
    const facts = Array.isArray(parsed.facts)
      ? parsed.facts
          .filter((fact): fact is string => typeof fact === 'string')
          .map((fact) => fact.trim())
          .filter((fact) => fact.length > 1 && fact.length <= 200)
          .slice(0, 3)
      : [];

    const claimedGender = parsed.grammaticalGender;
    const evidence = typeof parsed.genderEvidence === 'string' ? parsed.genderEvidence.trim() : '';
    const hasEvidence =
      evidence.length > 0 && userText.toLowerCase().includes(evidence.toLowerCase());
    const grammaticalGender: GrammaticalGender =
      hasEvidence && (claimedGender === 'masculine' || claimedGender === 'feminine')
        ? claimedGender
        : 'unknown';

    const changed = await updateUserMemory(userId, facts, grammaticalGender);
    if (changed) console.log('[extractAndSaveFact] updated memory for userId:', userId);
    return changed;
  } catch (err) {
    console.error('[extractAndSaveFact] error:', err);
    return false;
  }
}
