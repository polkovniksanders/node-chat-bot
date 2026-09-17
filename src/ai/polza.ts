import { logger } from '@/utils/logger.js';

/**
 * Polza.ai — единственный AI-провайдер.
 * OpenAI-compatible: POST {BASE_URL}/chat/completions с Bearer token.
 */

const BASE_URL = process.env.POLZA_API_URL ?? 'https://api.polza.ai/v1';
const API_KEY = process.env.POLZA_API_KEY ?? '';

// Модели: обычная (быстрая/дешёвая) и умная (медленнее/качественнее)
const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3-0324';
const DEFAULT_SMART_MODEL = 'openai/gpt-4.1-nano';

function getModel(): string {
  return process.env.POLZA_MODEL ?? DEFAULT_MODEL;
}

function getSmartModel(): string {
  return process.env.POLZA_SMART_MODEL ?? DEFAULT_SMART_MODEL;
}

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

async function callPolza(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const body = {
    model: opts.model ?? getModel(),
    messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`Polza API error ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}

/**
 * Обычный чат — быстрая/дешёвая модель.
 * Используется: крон-постинг, генерация контента, новости, реакции.
 */
export async function polzaChat(
  messages: ChatMessage[],
  opts?: Pick<ChatOptions, 'temperature' | 'maxTokens'>,
): Promise<string> {
  logger.debug('polzaChat request', { model: getModel(), messageCount: messages.length });
  return callPolza(messages, { ...opts, model: getModel() });
}

/**
 * Умный чат — более качественная модель.
 * Используется: AI-чат с пользователями, экстракция фактов.
 */
export async function polzaChatSmart(
  messages: ChatMessage[],
  opts?: Pick<ChatOptions, 'temperature' | 'maxTokens'>,
): Promise<string> {
  logger.debug('polzaChatSmart request', { model: getSmartModel(), messageCount: messages.length });
  return callPolza(messages, { ...opts, model: getSmartModel() });
}
