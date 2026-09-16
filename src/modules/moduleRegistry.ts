export interface ModuleDefinition {
  name: string;
  description: string;
  class: 'cron' | 'input' | 'admin';
  /** For cron modules: the env var key that holds the output channel ID */
  defaultChatIdEnv?: string;
}

export const MODULES = [
  // Cron
  {
    name: 'daily-news',
    description: 'День 1 цикла — новостной дайджест',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  {
    name: 'daily-animal-movie',
    description: 'День 2 цикла — котовости: животные из фильмов',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  {
    name: 'daily-youtube-video',
    description: 'День 3 цикла — видео с YouTube',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  {
    name: 'daily-pet-names',
    description: 'День 4 цикла — клички для питомцев',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  {
    name: 'daily-animal-story',
    description: 'День 5 цикла — рассказ о животном',
    class: 'cron',
    defaultChatIdEnv: 'CHANNEL_ID',
  },
  {
    name: 'daily-events',
    description: 'Утренний дайджест (кофе-фото, факты, финансы, культура)',
    class: 'cron',
    defaultChatIdEnv: 'EVENTS_CHANNEL_ID',
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
] as const satisfies readonly ModuleDefinition[];

/** Единственный источник имён модулей — выводится из MODULES */
export type ModuleName = (typeof MODULES)[number]['name'];

export const ALL_MODULE_NAMES: readonly ModuleName[] = MODULES.map((m) => m.name);

export function findModule(name: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.name === name);
}

export function getDefaultChatId(def: ModuleDefinition): string | undefined {
  if (!def.defaultChatIdEnv) return undefined;
  return process.env[def.defaultChatIdEnv];
}