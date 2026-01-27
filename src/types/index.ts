export type ChatMsg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_details?: unknown;
};

export interface OpenRouterResponse {
  choices: {
    message: {
      role: string;
      content: string | { type: string; text: string }[];
      reasoning_details?: any;
    };
  }[];
}
