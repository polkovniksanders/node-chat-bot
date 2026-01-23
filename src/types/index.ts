export type ChatMsg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_details?: unknown;
};
