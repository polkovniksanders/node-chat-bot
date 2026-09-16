---
title: "refactor: Module System Overhaul — Chat-Bound Modules, Dead Code Cleanup, Production Hardening"
type: refactor
status: completed
date: 2026-05-15
deepened: 2026-05-15
---

# refactor: Module System Overhaul — Chat-Bound Modules, Dead Code Cleanup, Production Hardening

## Enhancement Summary

**Углублено:** 2026-05-15  
**Агентов использовано:** security-lens, architecture-strategist, kieran-typescript, reliability-reviewer, correctness-reviewer, maintainability-reviewer, best-practices-researcher, feasibility-reviewer, scope-guardian

### Ключевые изменения по итогам review

1. **Критический баг в миграции**: существующие `chatModules` записи в `module-config.json` не переносятся в новую структуру — нужна двухшаговая миграция
2. **Неправильные имена модулей в плане**: `chat-ai`/`user-profile`/`chat-history` — несуществующие имена; правильные: `ai-chat`, `user-memory`. Это сломало бы компиляцию
3. **`/say` и `/secret` нельзя просто "отвязать" от `EVENTS_CHANNEL_ID`**: их семантика — отправка в канал, а не в текущий чат. Нужно заменить на `getCronChatIds('daily-events')[0]`
4. **Фаза 8 (логирование) и Фаза 9 (документация) выведены за рамки**: это отдельные задачи, не блокирующие основную цель
5. **`adminCheck.ts` не нужен**: нет третьего потребителя, fix — 2 строки в 2 файлах
6. **`const enum` запрещён**: используем `as const` + `satisfies` паттерн
7. **Аудит-лог (Улучшение Б) — YAGNI**: `logger.info` достаточно для одного администратора
8. **Ошибка безопасности**: callback-кнопки Sora (`sora:confirm`/`sora:cancel`) не проверяют isAdmin; `tempId` предсказуем

---

## Overview

Полный рефакторинг системы модулей бота. Цель — убрать жёсткую привязку чатов к переменным окружения (`CHANNEL_ID`, `EVENTS_CHANNEL_ID`), дать администратору возможность привязывать и отвязывать модули к конкретным чатам через команды прямо в чате, вычистить мёртвый код и дублирование, а также довести кодовую базу до production-уровня.

**Итоговое поведение:** администратор пишет `/module_enable daily-cycle` в нужном канале или группе — бот начинает постить туда. Пишет `/module_disable daily-cycle` — перестаёт. Никакой жёсткой привязки в `.env`.

---

## Анализ текущего состояния

### Проблема 1 — Channel ID в ENV вместо конфига

`CHANNEL_ID` и `EVENTS_CHANNEL_ID` используются как единственный «дефолтный» чат для cron-модулей:

| Файл | Строка | Использование |
|---|---|---|
| `src/cron/dailyCycle.ts` | 13 | `const CHANNEL_ID = process.env.CHANNEL_ID!` |
| `src/cron/dailyEvents.ts` | 35 | `const channelId = process.env.EVENTS_CHANNEL_ID!` |
| `src/cron/soraVideoCron.ts` | 7 | `const CHANNEL_ID = process.env.CHANNEL_ID!` |
| `src/modules/moduleRegistry.ts` | 17, 29 | `defaultChatIdEnv: 'CHANNEL_ID'` |
| `src/bot/handlers.ts` | 46, 167 | `/events` команда + channel reply detection |
| `src/bot/sayHandler.ts` | 21 | `/say` → `EVENTS_CHANNEL_ID` |
| `src/bot/whisperHandler.ts` | 50 | `/secret` → `EVENTS_CHANNEL_ID` |
| `src/index.ts` | 22 | conditional cron setup guard |

### Проблема 2 — Зеркалирование в тестовый канал

В `dailyCycle.ts` и `soraVideoCron.ts` каждый пост **дублируется** в `@node_js_test` (захардкожен). Это не тоглится, не задокументировано, и не нужно в production.

### Проблема 3 — Разрозненная проверка isAdmin

`moduleAdminHandler.ts` использует merged set из `ADMIN_USER_IDS` + `ADMIN_USER_ID`.
`sayHandler.ts` и `soraHandler.ts` парсят только `ADMIN_USER_ID` (singular) — значит, если добавить ID только в `ADMIN_USER_IDS`, эти обработчики не распознают нового админа. **Это реальный баг**, а не косметика.

### Проблема 4 — TEST_CHANNEL в soraVideoCron.ts

`src/cron/soraVideoCron.ts:8` — переобъявляет `const TEST_CHANNEL = '@node_js_test'` вместо импорта из `@/config/constants.js`.

### Проблема 5 — String vs number chat ID inconsistency

Cron модули передают `CHANNEL_ID` как строку (`@stepka_and_twitty` или числовая строка). Input handlers передают `ctx.chat.id` как `number`. Ключ в конфиге всегда stringified. **Критично**: миграция может записать `@username`, а `/module_enable` — числовой ID, что создаст дубли в `cronChats`.

### Проблема 6 — Dual-format admin env vars

`moduleAdminHandler` поддерживает оба `ADMIN_USER_ID` и `ADMIN_USER_IDS` — но `sayHandler` и `soraHandler` читают только `ADMIN_USER_ID`.

### Проблема 7 — `isEnabled` на cron-модулях в cron-файлах — dead code

В `dailyCycle.ts:62`, `dailyEvents.ts:41`, `soraVideoCron.ts:36` есть `isEnabled(channelId, 'daily-cycle')`. Эта проверка читает из `chatModules` ключ, который никогда не пишется для cron-модулей — всегда возвращает `true`. Мёртвый код, который нужно удалить в Phase 3.

### Проблема 8 — ALL_MODULES захардкожен в getStatus()

В `moduleConfig.ts:92` есть захардкоженный массив всех модулей для `getStatus`. Если добавить модуль в реестр — `getStatus` молча пропустит его. Нужно итерировать `MODULES` из `moduleRegistry.ts`.

### Проблема 9 — Sora callback без auth check

В `soraHandler.ts:75-107` callback-кнопки `sora:confirm` и `sora:cancel` **не проверяют `isAdmin()`**. `tempId` формата `${Date.now()}_${userId}` предсказуем для тех, кто знает userId администратора. Это security-уязвимость.

### Проблема 10 — cycleState не атомарный

`cycleState.ts:writeState()` пишет напрямую в файл без tmp/rename. Крэш в момент записи оставит повреждённый JSON → сброс цикла на день 1. Также: день продвигается **до** успешной отправки поста — при ошибке день пропускается навсегда.

---

## Предлагаемое решение

### Концепция: Chat-bound Modules (Привязка к чатам через конфиг)

Хранить список **активных chatId** для каждого cron-модуля в `data/module-config.json`. Cron-задача итерирует этот список и постит в каждый привязанный чат.

```
Было (ENV-based):
  CHANNEL_ID=@stepka_and_twitty  →  dailyCycle всегда постит сюда
  
Стало (Config-based):
  module-config.json:
  {
    "chatModules": { "-1001234567890": { "weather": false } },
    "cronChats": { "daily-cycle": ["-1001234567890"], "daily-events": ["-1002356703279"] }
  }
  
  При /module_enable daily-cycle в канале → добавляет chatId этого канала в список
  При /module_disable daily-cycle → убирает chatId из списка
```

### Новая структура `module-config.json`

```json
{
  "_migrated": "v2",
  "chatModules": {
    "-1001234567890": {
      "weather": false,
      "voice-transcription": true
    }
  },
  "cronChats": {
    "daily-cycle": ["-1001234567890"],
    "daily-events": ["-1002356703279"],
    "sora-videos": ["-1001234567890"]
  }
}
```

**Sentinel `_migrated: "v2"`** — однозначно определяет, что миграция прошла. Не зависит от наличия/отсутствия ключей.

**Разделение типов модулей:**
- `input` / `admin` модули: per-chat toggle (ключ `chatModules`, по умолчанию `true`)
- `cron` модули: список chatId, которые получают посты (ключ `cronChats`, по умолчанию пусто)

### chatId Normalization Policy

**Правило**: всегда хранить numeric chatId. При `/module_enable`:
- если аргумент — уже число или числовая строка → хранить как есть
- если аргумент начинается с `@` → нормализовать через `bot.api.getChat()` → хранить `String(chat.id)`

Миграция из ENV также должна нормализовать. Если `getChat` недоступен в момент миграции — хранить raw значение с предупреждением в лог.

---

## Технический план (скоуп)

> Minimal viable scope по итогам scope-guardian review. Фазы 8 (logging) и 9 (docs) выведены за рамки.

### Phase 1 — Исправление isAdmin в sayHandler и soraHandler

**Цель:** ликвидировать расхождение — оба читают только `ADMIN_USER_ID`, нужно добавить `ADMIN_USER_IDS`.

**НЕ создавать** `src/utils/adminCheck.ts` — нет третьего потребителя, это преждевременная абстракция.

**Изменение в `src/bot/sayHandler.ts` и `src/bot/soraHandler.ts`:**
```typescript
// Было (sayHandler.ts:8-10):
const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID);
const isAdmin = (id: number) => id === ADMIN_USER_ID;

// Стало — точно так же, как в moduleAdminHandler.ts:7-18:
const adminIds = new Set<number>([
  ...(process.env.ADMIN_USER_IDS?.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0) ?? []),
  ...(process.env.ADMIN_USER_ID ? 
      [parseInt(process.env.ADMIN_USER_ID.trim(), 10)].filter(n => !isNaN(n) && n > 0) : []),
]);
const isAdmin = (id: number) => adminIds.has(id);
```

**Одновременно:** добавить `isAdmin()` check в `soraHandler.ts:75` для callback-кнопок `sora:confirm` и `sora:cancel`:
```typescript
bot.callbackQuery(/^sora:(confirm|cancel):/, async (ctx) => {
  if (!ctx.from?.id || !isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery({ text: '⛔ Нет доступа' });
    return;
  }
  // ...
});
```

**Исправить `tempId`** на `crypto.randomBytes(16).toString('hex')` вместо предсказуемого `${Date.now()}_${userId}`.

---

### Phase 2 — Новая схема ModuleConfig

**Файл:** `src/modules/moduleConfig.ts`

#### TypeScript типы (правильные имена!)

Используем `as const` + `satisfies` — **никаких `const enum`** (несовместимо с `isolatedModules`).

```typescript
// src/modules/moduleRegistry.ts — единственный источник правды
export const MODULE_NAMES = [
  'daily-cycle',
  'daily-events', 
  'sora-videos',
  'ai-chat',           // ← правильное имя (не 'chat-ai')
  'image-generation',
  'voice-transcription',
  'weather',
  'events-manual',
  'secret-whisper',
  'say-admin',
  'sora-admin',
  'user-memory',       // ← правильное имя (не 'user-profile')
  'emoji-reactions',   // ← существует в реестре, не забыть!
] as const;

export type ModuleName = typeof MODULE_NAMES[number];
// Нет CronModuleName/InputModuleName Exclude<> — runtime class из registry
```

> **Research insight**: `const enum` ломает `isolatedModules` в проектах с `tsx`/`esbuild`. Используй `as const` tuple + `typeof T[number]` — единственный source of truth, тип обновляется автоматически при добавлении модуля.

#### Новый интерфейс хранилища

```typescript
interface ModuleConfig {
  _migrated?: string;
  chatModules: Record<string, Partial<Record<ModuleName, boolean>>>;
  cronChats: Partial<Record<string, string[]>>;  // ключ — ModuleName cron-модулей
}
```

#### Новое API

```typescript
// Read
export function isModuleEnabled(chatId: string | number, module: ModuleName): boolean
export function getCronChatIds(module: ModuleName): string[]

// Write  
export async function enableCronModule(chatId: string, module: ModuleName): Promise<void>
export async function disableCronModule(chatId: string, module: ModuleName): Promise<void>
export async function setInputModule(chatId: string, module: ModuleName, enabled: boolean): Promise<void>

// Status
export function getStatusForChat(chatId: string): Record<ModuleName, { enabled: boolean; isCronModule: boolean; inCronList: boolean }>
```

**`getStatusForChat` — итерировать `MODULES` из moduleRegistry, не хардкоженный массив:**
```typescript
import { MODULES } from '@/modules/moduleRegistry.js';
// ...
for (const def of MODULES) {
  const isCron = def.class === 'cron';
  if (isCron) {
    result[def.id] = { enabled: getCronChatIds(def.id).includes(chatId), isCronModule: true, inCronList: true };
  } else {
    const override = chatConfig[def.id];
    result[def.id] = { enabled: override === undefined ? true : override, isCronModule: false, inCronList: false };
  }
}
```

#### Двухшаговая миграция (КРИТИЧНО)

```typescript
async function migrate(config: any): Promise<ModuleConfig> {
  if (config._migrated === 'v2') return config as ModuleConfig;

  // Step 1: перенести существующие chatModules из flat format
  const oldChatModules: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    // Старый формат: ключи — это chatId (числовые строки или @usernames)
    // Новый: config.chatModules[chatId]
    if (key !== '_migrated' && key !== 'chatModules' && key !== 'cronChats') {
      if (typeof value === 'object' && value !== null) {
        oldChatModules[key] = value;
      }
    }
  }

  // Step 2: наполнить cronChats из ENV
  const cronChats: Partial<Record<string, string[]>> = {};
  if (process.env.CHANNEL_ID) {
    const id = await normalizeChatId(process.env.CHANNEL_ID);
    cronChats['daily-cycle'] = [id];
    cronChats['sora-videos'] = [id];
    if (id !== process.env.CHANNEL_ID) {
      logger.info('[config] Normalized CHANNEL_ID to numeric ID during migration');
    }
  }
  if (process.env.EVENTS_CHANNEL_ID) {
    const id = await normalizeChatId(process.env.EVENTS_CHANNEL_ID);
    cronChats['daily-events'] = [id];
  }

  const migrated: ModuleConfig = {
    _migrated: 'v2',
    chatModules: Object.keys(oldChatModules).length > 0 ? oldChatModules : (config.chatModules ?? {}),
    cronChats: config.cronChats ?? cronChats,
  };

  // Graceful ENV notice
  if (process.env.CHANNEL_ID && Object.keys(cronChats).length > 0) {
    logger.warn('[config] CHANNEL_ID and EVENTS_CHANNEL_ID env vars are no longer required after migration. Consider removing them from .env');
  }

  return migrated;
}
```

**`normalizeChatId` для миграции:**
```typescript
async function normalizeChatId(id: string): Promise<string> {
  if (/^-?\d+$/.test(id)) return id;  // уже числовой
  try {
    const chat = await bot.api.getChat(id);
    return String(chat.id);
  } catch {
    logger.warn(`[config] Cannot normalize chatId "${id}" via Telegram API, storing as-is`);
    return id;  // лучше stored @username, чем падение
  }
}
```

**`enableCronModule` с дедупликацией и нормализацией:**
```typescript
export async function enableCronModule(chatId: string, module: ModuleName): Promise<void> {
  // chatId должен уже быть нормализован до numeric перед вызовом
  return setEnabled(async () => {
    const chatIds = config.cronChats[module] ?? [];
    if (!chatIds.includes(chatId)) {
      config.cronChats[module] = [...chatIds, chatId];
      await persistConfig();
    }
  });
}
```

> **Research insight**: Telegram Bot API всегда возвращает numeric chatId в ответах. `@username` — только входной формат. Никогда не храни `@username` как ключ — каналы могут менять username.

---

### Phase 3 — Обновление moduleRegistry.ts + удаление dead code

**Убрать из `ModuleDefinition`:**
```typescript
// Было:
{ id: 'daily-cycle', class: 'cron', defaultChatIdEnv: 'CHANNEL_ID', ... }

// Стало:
{ id: 'daily-cycle', class: 'cron', ... }
```

**Удалить:**
- Поле `defaultChatIdEnv` из интерфейса `ModuleDefinition`
- Функцию `getDefaultChatId()` — она будет мёртвой после Phase 2

**Добавить экспорт:**
```typescript
export const MODULE_NAMES = [...] as const;
export type ModuleName = typeof MODULE_NAMES[number];
```

---

### Phase 4 — Обновление cron-файлов

#### `src/cron/dailyCycle.ts`

```typescript
// Было:
const CHANNEL_ID = process.env.CHANNEL_ID!;
// ...
await sendPost(CHANNEL_ID, content);
await bot.api.sendPhoto(TEST_CHANNEL, ...);  // ← УДАЛИТЬ

// Стало:
import { getCronChatIds } from '@/modules/moduleConfig.js';
// ...
// Генерировать контент ОДИН РАЗ вне цикла — не N раз для N чатов:
const content = await generateDayContent(day);

const chatIds = getCronChatIds('daily-cycle');
if (chatIds.length === 0) {
  logger.info('[daily-cycle] No chats configured, skipping');
  return;
}

for (const chatId of chatIds) {
  try {
    await sendPost(chatId, content);
  } catch (err) {
    handleCronError(err, chatId, 'daily-cycle');
  }
}
```

**Удалить:** `isEnabled(channelId, 'daily-cycle')` вызов (строка 62) — dead code после Phase 2.

**Порядок**: сначала `markAsPosted()` / продвинуть цикл **только после успешной отправки**:
```typescript
// Было (cycleState.ts): consumeCurrentDay() до sendPost()
// Стало: передавать день явно, продвигать после loop
const day = readCurrentDay();
// ... generate content ...
// ... send loop ...
advanceDay();  // только если хоть что-то отправилось
```

**`handleCronError` — централизованная обработка ошибок:**
```typescript
function handleCronError(err: unknown, chatId: string, module: string): void {
  if (err instanceof GrammyError) {
    if (err.error_code === 429) {
      const retryAfter = err.parameters?.retry_after ?? 5;
      logger.warn(`[${module}] Rate limited for ${chatId}, retry_after=${retryAfter}s`);
      // TODO: requeue with delay (acceptable to skip for now given 2-3 channels)
    } else if (err.error_code === 403) {
      logger.error(`[${module}] Bot kicked from ${chatId} — consider removing from config`);
      // Не автоудаляем — только логируем. Администратор решит сам.
    } else {
      logger.error(`[${module}] Telegram error for ${chatId}:`, err.description);
    }
  } else {
    logger.error(`[${module}] Failed to send to ${chatId}:`, err);
  }
}
```

> **Research insight**: Telegram возвращает 429 с `retry_after` в секундах. GrammyError имеет `error_code` и `parameters.retry_after`. Не глотай все ошибки одинаково — различай 403 (кикнут), 429 (rate limit), и прочие.

#### `src/cron/dailyEvents.ts`

```typescript
// Стало:
const chatIds = getCronChatIds('daily-events');
if (chatIds.length === 0) { logger.info('[daily-events] No chats configured, skipping'); return; }

for (const chatId of chatIds) {
  try {
    await sendDailyDigest(chatId, events);
  } catch (err) {
    handleCronError(err, chatId, 'daily-events');
  }
}
```

**ВАЖНО для setTimeout-блоков (10:00 AM scheduled dialogues):**
```typescript
// setTimeout closures должны вызывать getCronChatIds() ВНУТРИ callback,
// не захватывать chatId в момент создания таймера.
// Иначе: disable между 10:00 и 18:00 не работает.

setTimeout(async () => {
  const liveChats = getCronChatIds('daily-events');  // читать в момент выполнения
  for (const chatId of liveChats) {
    try {
      await sendRandomDialogue(chatId);
    } catch (err) {
      handleCronError(err, chatId, 'daily-events');
    }
  }
}, delayMs);
```

#### `src/cron/soraVideoCron.ts`

```typescript
// Удалить: const TEST_CHANNEL = '@node_js_test' (дубликат)
// Удалить: все отправки в TEST_CHANNEL в happy path
// Исправить: markAsPosted() вызывать ДО отправки в secondary channels

const chatIds = getCronChatIds('sora-videos');
// ...
await bot.api.sendVideo(primaryChatId, video);
await markAsPosted(item.id);  // ← сразу после primary success
// ... остальные chatIds...
```

---

### Phase 5 — Обновление moduleAdminHandler.ts

#### Новая логика `/module_enable` и `/module_disable`

```typescript
async function handleToggle(ctx: Context, module: string, enable: boolean) {
  const def = findModule(module);
  if (!def) { await ctx.reply('❌ Неизвестный модуль'); return; }

  const chatId = String(ctx.chat!.id);

  if (def.class === 'cron') {
    if (enable) {
      // Нормализовать chatId перед сохранением
      const normalizedId = await normalizeChatId(chatId);
      await enableCronModule(normalizedId, def.id);
      await ctx.reply(`✅ Модуль <b>${def.id}</b> включён для этого чата (${normalizedId})`, { parse_mode: 'HTML' });
    } else {
      const normalizedId = await normalizeChatId(chatId);
      await disableCronModule(normalizedId, def.id);
      await ctx.reply(`❌ Модуль <b>${def.id}</b> выключен для этого чата`, { parse_mode: 'HTML' });
    }
  } else {
    await setInputModule(chatId, def.id, enable);
    const status = enable ? '✅ включён' : '❌ выключен';
    await ctx.reply(`Модуль <b>${def.id}</b> ${status} для этого чата`, { parse_mode: 'HTML' });
  }
}
```

**Убрать:** `getDefaultChatId()` вызовы, `chatId` аргумент валидацию против дефолтного.

#### Обновлённый `/module_status`

```typescript
// Для cron-модулей: показывать включён ли ЭТОТ chatId
// Для input-модулей: показывать enabled/disabled для этого чата

const lines = MODULES.map(def => {
  if (def.class === 'cron') {
    const chats = getCronChatIds(def.id);
    const isHere = chats.includes(chatId);
    return `${isHere ? '🟢' : '⚪'} <b>${def.id}</b> (cron, ${chats.length} чатов${isHere ? ', включая этот' : ''})`;
  } else {
    const enabled = isModuleEnabled(chatId, def.id);
    return `${enabled ? '✅' : '❌'} <b>${def.id}</b>`;
  }
});
```

#### Обновлённый `/module_list` (два режима)

```
/module_list           — статус для текущего чата
/module_list all       — все привязки всех cron-модулей (глобальный вид)
```

#### Скрытие admin-команд от публики

Добавить в `src/index.ts` после старта бота:
```typescript
// Регистрируем admin-команды только для администраторов (видны только им в BotFather menu)
for (const adminId of adminIds) {
  await bot.api.setMyCommands(ADMIN_COMMANDS, { 
    scope: { type: 'chat', chat_id: adminId } 
  });
}
```

---

### Phase 6 — Обновление sayHandler.ts и whisperHandler.ts

**ВАЖНО:** `/say` и `/secret` отправляют сообщения **в канал** — это их семантика. Нельзя заменить на `ctx.chat.id` (это DM администратора). Правильная замена — `getCronChatIds('daily-events')[0]`:

```typescript
// src/bot/sayHandler.ts
// Было:
const channelId = process.env.EVENTS_CHANNEL_ID;

// Стало:
const chatIds = getCronChatIds('daily-events');
const channelId = chatIds[0];  // берём первый настроенный канал
if (!channelId) {
  await ctx.reply('❌ Нет настроенного канала. Используй /module_enable daily-events в целевом канале.');
  return;
}
```

```typescript
// src/bot/whisperHandler.ts — аналогично
const chatIds = getCronChatIds('daily-events');
const channelId = chatIds[0];
if (!channelId) {
  await ctx.reply('❌ Нет настроенного канала для анонимных сообщений.');
  return;
}
```

**handlers.ts — `/events` команда:**
```typescript
// Было: отправить в EVENTS_CHANNEL_ID
// Стало: отправить в первый настроенный daily-events чат
const chatIds = getCronChatIds('daily-events');
const targetChatId = chatIds[0] ?? String(ctx.chat.id);
await bot.api.sendMessage(targetChatId, digest);
```

---

### Phase 7 — Исправление cycleState.ts

Два бага в одном файле:

**Баг 1:** Non-atomic write. Применить tmp/rename как в `moduleConfig.ts`:
```typescript
// src/content/cycleState.ts
async function writeState(state: CycleState): Promise<void> {
  const tmp = STATE_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmp, STATE_FILE);
}
```

**Баг 2:** День продвигается до успешной отправки:
```typescript
// Было:
const day = consumeCurrentDay();  // ← продвигает сразу
await sendPost(chatId, day);

// Стало:
const day = readCurrentDay();
// ... content generation ...
// ... send loop ...
advanceDay();  // ← только после успешной отправки
```

---

### Phase 8 — TEST_CHANNEL cleanup

После Phase 4 (удаление TEST_CHANNEL из happy path cron):
- Проверить все импорты `TEST_CHANNEL` в codebase: `grep -r 'TEST_CHANNEL' src/`
- Если остались только в error-notification paths (`catch` блоки) — оставить
- Если нигде не используется — удалить из `src/config/constants.ts`
- Удалить `EVENTS_CHANNEL_ID` guard из `src/index.ts` (cron теперь всегда регистрируется, делает no-op если пусто)

---

## Edge Cases и Потенциальные Баги

### EC-1: Cron без привязанных чатов
`getCronChatIds('daily-cycle')` → `[]` → тихий no-op с логом.
```
[daily-cycle] No chats configured, skipping
```

### EC-2: Бот кикнут из канала (error_code 403)
Per-chatId try/catch + `handleCronError`. Логировать ошибку и продолжать. **Не автоудалять** — только уведомить. Если нужно, администратор делает `/module_disable`.

### EC-3: Telegram 429 Rate Limit
Детектировать по `err.error_code === 429`, логировать `retry_after`. При 2-3 каналах rate limit практически невозможен. Не добавлять retry loop — over-engineering для текущего scale.

### EC-4: Двухшаговая миграция module-config.json
Sentinel `_migrated: "v2"` определяет нужность миграции.
- Перенести существующие `chatModules` из flat format
- Наполнить `cronChats` из ENV с нормализацией

### EC-5: @username vs numeric chatId — нормализация при `/module_enable`
Всегда нормализовать через `bot.api.getChat()` при enable. Деduplication check сравнивает нормализованные строки.

### EC-6: Дубликат chatId в cronChats
Дедупликация в `enableCronModule`:
```typescript
if (!chatIds.includes(chatId)) {
  config.cronChats[module] = [...chatIds, chatId];
}
```
O(n) — нормально при ≤100 чатах.

### EC-7: Content generation падает до send loop
Если AI-генерация кидает исключение — catch снаружи loop, день **не** продвигается (Баг 2 в Phase 7 фиксит это).

### EC-8: setTimeout closures в dailyEvents.ts
Читать `getCronChatIds()` внутри callback, не в момент создания таймера. Таймер может fire через 8 часов — за это время конфиг мог измениться.

### EC-9: Пустой `adminIds` set при старте
Если и `ADMIN_USER_IDS` и `ADMIN_USER_ID` пусты или невалидны — `adminIds.size === 0`. Добавить startup warning:
```typescript
if (adminIds.size === 0) {
  logger.warn('[admin] No admin IDs configured! Set ADMIN_USER_IDS in .env');
}
```

### EC-10: Миграция без bot API (getChat недоступен)
В модуле есть top-level await. `bot.api.getChat()` требует живого bot instance. Если API недоступен при старте — логировать и хранить raw @username. Не падать.

---

## Security Findings (требуют исправления)

### SEC-1: Пустой adminIds — нет startup abort ⚠️
**HIGH**: Если `ADMIN_USER_IDS` и `ADMIN_USER_ID` оба пусты или невалидны — бот стартует без администраторов. Все admin-команды тихо игнорируются. **Добавить warning** (не abort — бот должен работать даже без admins в deployment).

### SEC-2: Нет проверки isAdmin в Sora callback-кнопках ⚠️
**HIGH**: `sora:confirm` и `sora:cancel` callbacks в `soraHandler.ts:75-107` не проверяют adminIds. `tempId` предсказуем (`Date.now()_userId`). Исправить в **Phase 1**.

### SEC-3: module-config.json — нет schema validation при load
**MEDIUM**: Tampered/corrupted файл может добавить произвольный chatId в `cronChats`. Добавить простую type-guard валидацию при `loadConfig`:
```typescript
function isValidConfig(obj: unknown): obj is ModuleConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as any;
  if (typeof c.chatModules !== 'object') return false;
  if (typeof c.cronChats !== 'object') return false;
  // Validate chatId format in cronChats
  for (const [module, ids] of Object.entries(c.cronChats ?? {})) {
    if (!Array.isArray(ids)) return false;
    for (const id of ids as unknown[]) {
      if (typeof id !== 'string' || !/^-?\d+$/.test(id)) return false;  // только numeric
    }
  }
  return true;
}
```

### SEC-4: whispers.json — PII без retention policy
**MEDIUM** (в скоупе документации): `whispers.json` хранит `userId`, `username`, `firstName` и текст сообщения навечно. Файл растёт неограниченно. Добавить в документацию (`data/README.md`), реализовать retention в отдельной задаче.

### SEC-5: /module_status раскрывает все cronChats любому admin
**LOW**: Любой admin может видеть все каналы где активны модули. Это приемлемо для single-admin бота.

---

## Предложения по улучшению

### Улучшение А: Команда `/module_status` контекстно-осведомлена
Включено в Phase 5 — показывает статус для текущего чата разделённо по типам.

### ~~Улучшение Б: Audit log~~ — ОТКЛОНЕНО
`logger.info` в `moduleAdminHandler.ts:126` уже пишет все изменения. Отдельный JSON-файл — YAGNI.

### Улучшение В: `/module_list all`
Включено в Phase 5 — вызов с аргументом `all` показывает глобальный вид.

### Улучшение Г: Graceful ENV migration notice
Включено в Phase 2 migration code — `logger.warn` после успешной миграции.

### Улучшение Д: Admin commands scope в BotFather
Включено в Phase 5 — `setMyCommands` с `chat` scope для admin user IDs.

---

## Acceptance Criteria

### Функциональные требования
- [ ] `/module_enable <name>` в любом чате добавляет normalised numeric chatId в cronChats для cron-модулей
- [ ] `/module_enable <name>` для input-модулей включает модуль в текущем чате
- [ ] `/module_disable <name>` симметрично убирает / выключает
- [ ] Cron-задачи итерируют `getCronChatIds()` из конфига, **не читают ENV**
- [ ] `CHANNEL_ID` и `EVENTS_CHANNEL_ID` не являются обязательными (бот стартует без них)
- [ ] Двухшаговая миграция: старые `chatModules` переносятся + `cronChats` наполняется из ENV
- [ ] `/module_status` показывает для cron-модулей: включён ли **этот** chatId; для input: enabled/disabled
- [ ] Тестовый канал `@node_js_test` не получает production посты в happy path
- [ ] `/say` и `/secret` отправляют в первый настроенный `daily-events` чат (не в DM)

### Технические требования
- [ ] `isAdmin()` в sayHandler и soraHandler читает `ADMIN_USER_IDS` и `ADMIN_USER_ID`
- [ ] `sora:confirm`/`sora:cancel` callbacks проверяют `isAdmin()`
- [ ] `tempId` в soraHandler — `crypto.randomBytes(16).toString('hex')`
- [ ] Нет дублирования `TEST_CHANNEL` константы (только import из constants)
- [ ] `getCronChatIds()` используется внутри setTimeout callbacks в dailyEvents.ts
- [ ] `cycleState.ts` — atomic write (tmp/rename), день продвигается после успеха
- [ ] `getStatusForChat()` итерирует `MODULES` из registry, не хардкоженный массив
- [ ] `isEnabled(chatId, 'daily-cycle')` guard удалён из cron-файлов (dead code)
- [ ] Schema validation в `loadConfig()` — reject некорректных chatId форматов
- [ ] Startup warning если `adminIds.size === 0`
- [ ] TypeScript компилируется без ошибок — все ModuleName используют правильные имена (`ai-chat`, `user-memory`, `emoji-reactions`)
- [ ] `getDefaultChatId()` удалена из moduleRegistry.ts

### Документация (минимум в скоупе)
- [ ] `.env.example` создан: все vars с комментариями, `CHANNEL_ID`/`EVENTS_CHANNEL_ID` помечены как `deprecated/optional`
- [ ] `README.md` обновлён: user-memory path, module-config.json в data/, команды управления модулями

---

## Зависимости

- grammy (уже используется — `GrammyError` для error_code detection)
- node-cron (уже используется)
- Нет новых внешних зависимостей

## Риски

| Риск | Вероятность | Митигация |
|---|---|---|
| Потеря chatModules при миграции | Высокая без fix | Двухшаговая миграция с переносом flat entries |
| Двойная отправка из @username vs numeric ID | Средняя | Нормализация при enable + в миграции |
| Неправильный `/say`/`/secret` behavior | Высокая без fix | Заменить на `getCronChatIds('daily-events')[0]` |
| Бот кикнут из канала | Средняя | Per-chat try/catch + `handleCronError` |
| Пустой cronChats → no-op | Ожидаемо | Логировать, продолжать |
| Telegram API недоступен при миграции | Низкая | Fallback: хранить raw, warn в лог |

---

## Порядок реализации

```
Phase 1  →  isAdmin fix в sayHandler/soraHandler + Sora callback security  [~30 мин]
Phase 2  →  moduleConfig.ts — новая схема + двухшаговая миграция            [~2 ч]
Phase 3  →  moduleRegistry.ts — MODULE_NAMES as const, удалить dead code     [~20 мин]
Phase 4  →  cron files — getCronChatIds loop, remove TEST_CHANNEL, fix cycle [~1.5 ч]
Phase 5  →  moduleAdminHandler.ts — новая логика команд + /module_status     [~1 ч]
Phase 6  →  sayHandler/whisperHandler/handlers.ts — getCronChatIds замена    [~30 мин]
Phase 7  →  cycleState.ts — atomic write + порядок advance                   [~20 мин]
Phase 8  →  TEST_CHANNEL audit + index.ts guard removal + .env.example       [~20 мин]
```

**Итого:** ~7 часов

---

## Файлы, которые изменятся

| Файл | Изменение |
|---|---|
| `src/modules/moduleConfig.ts` | **Изменить** — новая схема, двухшаговая миграция, schema validation |
| `src/modules/moduleRegistry.ts` | **Изменить** — MODULE_NAMES as const, удалить defaultChatIdEnv + getDefaultChatId |
| `src/cron/dailyCycle.ts` | **Изменить** — getCronChatIds loop, удалить TEST_CHANNEL, fix cycle advance |
| `src/cron/dailyEvents.ts` | **Изменить** — getCronChatIds, setTimeout читает chatIds в момент выполнения |
| `src/cron/soraVideoCron.ts` | **Изменить** — getCronChatIds, удалить локальный TEST_CHANNEL, fix markAsPosted order |
| `src/bot/moduleAdminHandler.ts` | **Изменить** — новая логика enable/disable/status, /module_list all, setMyCommands |
| `src/bot/sayHandler.ts` | **Изменить** — isAdmin fix (ADMIN_USER_IDS), getCronChatIds вместо EVENTS_CHANNEL_ID |
| `src/bot/soraHandler.ts` | **Изменить** — isAdmin fix, auth check в callbacks, crypto.randomBytes tempId |
| `src/bot/handlers.ts` | **Изменить** — /events команда: getCronChatIds вместо EVENTS_CHANNEL_ID |
| `src/bot/whisperHandler.ts` | **Изменить** — getCronChatIds('daily-events')[0] вместо EVENTS_CHANNEL_ID |
| `src/content/cycleState.ts` | **Изменить** — atomic write, advance after success |
| `src/config/constants.ts` | **Изменить** — убрать TEST_CHANNEL если не используется после Phase 4 |
| `src/index.ts` | **Изменить** — убрать EVENTS_CHANNEL_ID guard |
| `README.md` | **Обновить** — env vars, paths, module commands |
| `.env.example` | **Создать** — все vars с комментариями |

---

## References

### Internal
- `src/modules/moduleConfig.ts` — текущая реализация хранилища
- `src/modules/moduleRegistry.ts:17,29` — `defaultChatIdEnv` определения (к удалению)
- `src/bot/moduleAdminHandler.ts:7-24` — correct admin ID merge pattern (replicate to sayHandler/soraHandler)
- `src/cron/dailyCycle.ts:21-27` — TEST_CHANNEL дублирование
- `src/cron/soraVideoCron.ts:8` — локальный TEST_CHANNEL (duplication)
- `src/bot/soraHandler.ts:75-107` — callback без auth check (SEC-2)
- `src/content/cycleState.ts:22-28` — non-atomic write (Phase 7)
- `src/cron/dailyEvents.ts:151-191` — setTimeout closures (EC-8)
- `docs/plans/2026-05-05-feat-per-chat-module-toggle-system-plan.md` — предыдущий план (completed)

### External Research
- [grammY Sessions and Storing Data](https://grammy.dev/plugins/session)
- [grammy-guard: isAdmin composition](https://github.com/deptyped/grammy-guard)
- [Telegram Bot API: chatId formats and conversion](https://core.telegram.org/api/bots/ids)
- [GramIO: Rate limits, retry_after handling](https://gramio.dev/rate-limits)
- [TypeScript `as const` vs `enum` — isolatedModules compatibility](https://dev.to/maryanmats/why-i-stopped-using-enums-in-typescript-i-use-as-const-instead-2c1f)

### Related PRs
- PR #5: feat/per-chat-module-toggle (basis for this refactor)
