import type { ModuleName } from '@/modules/moduleConfig.js';

export interface ModuleDefinition {
  name: ModuleName;
  description: string;
  class: 'cron' | 'input' | 'admin';
  /** For cron modules: the env var key that holds the output channel ID */
  defaultChatIdEnv?: string;
}

export const MODULES: ModuleDefinition[] = [
  // Cron
  {
    name: 'daily-cycle',
    description: '5-дневный цикл постов (котовости, фильмы, видео, клички, рассказы)',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  {
    name: 'daily-events',
    description: 'Утренний дайджест (кофе-фото, факты, финансы, культура)',
    class: 'cron',
    defaultChatIdEnv: 'EVENTS_CHANNEL_ID',
  },
  {
    name: 'sora-videos',
    description: 'Постинг Sora-видео из очереди',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  // Input
  {
    name: 'ai-chat',
    description: 'AI-ответы на @упоминания, реплаи и всё в личных сообщениях',
    class: 'input',
  },
  {
    name: 'voice-transcription',
    description: 'Авто-транскрипция голосовых в личке + команда /transcribe',
    class: 'input',
  },
  {
    name: 'image-generation',
    description: 'Генерация изображений по команде /generate',
    class: 'input',
  },
  {
    name: 'weather',
    description: 'Погода по команде /weather и тексту "погода" в личке',
    class: 'input',
  },
  {
    name: 'secret-whisper',
    description: 'Анонимные шёпоты в канал по команде /secret',
    class: 'input',
  },
  {
    name: 'events-manual',
    description: 'Ручной запуск дайджеста по команде /events',
    class: 'input',
  },
  {
    name: 'emoji-reactions',
    description: '15% случайных emoji-реакций в группах',
    class: 'input',
  },
  {
    name: 'user-memory',
    description: 'AI-экстракция и сохранение фактов о пользователях',
    class: 'input',
  },
  // Admin
  {
    name: 'sora-admin',
    description: 'Загрузка Sora-видео в очередь через DM',
    class: 'admin',
  },
  {
    name: 'say-admin',
    description: 'Отправка сообщения пользователю командой /say',
    class: 'admin',
  },
];

export function findModule(name: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.name === name);
}

export function getDefaultChatId(def: ModuleDefinition): string | undefined {
  if (!def.defaultChatIdEnv) return undefined;
  return process.env[def.defaultChatIdEnv];
}
