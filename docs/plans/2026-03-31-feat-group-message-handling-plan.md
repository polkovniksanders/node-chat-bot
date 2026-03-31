---
title: "feat: Переработка логики ответов бота в группах"
type: feat
status: completed
date: 2026-03-31
---

# feat: Переработка логики ответов бота в группах

## Overview

Полная переработка обработчика групповых сообщений в `src/bot/handlers.ts`. Бот (Степка) должен отвечать в группах на:
1. **@упоминание** — любое сообщение, содержащее `@bot_username`
2. **Reply на сообщение бота** — когда пользователь нажимает "Ответить" на сообщение Степки
3. **Reply на пост канала** — когда пользователь отвечает на пост из связанного канала (уже частично работает, нужно починить)

Логика личных сообщений (`ctx.chat.type === 'private'`) **не трогается**.

---

## Проблемы в текущей реализации (`src/bot/handlers.ts`)

### 1. Нет @mention detection (lines 122–145)
Если пользователь пишет `@stepka_bot что думаешь?` без reply — бот **игнорирует** сообщение. `isReplyToBot` и `isReplyToChannel` оба false → `return`.

### 2. `activeGroupUser` Map не используется (lines 119, 151, 190–194)
Map создаётся, записывается, но **никогда не читается** для маршрутизации. Задумывалась для отслеживания активного диалога, но логика не реализована. Нужно либо реализовать, либо удалить.

### 3. Баг: `isReplyToChannel` никогда не срабатывает по ID (lines 131–134)
```typescript
replySenderChat?.id?.toString() === process.env.CHANNEL_ID
// CHANNEL_ID = "@node_js_test" (строка с @)
// replySenderChat.id — число (например -1001234567890)
// Сравнение всегда false
```
Срабатывают только username-проверки на lines 131–133.

### 4. История переписки не разделена по чатам (src/context/memory.ts)
`contexts` — `Map<userId, ChatMsg[]>`. Один и тот же контекст используется для лички и группы. Если пользователь общается и там и там — контексты смешиваются.

### 5. Нет fallback AI-провайдера в `generateReply.ts`
Используется только `gptunnelChat`. При ошибке — `'Ошибка при обращении к модели.'` без retry. `generateContent.ts` с цепочкой fallback-провайдеров не используется.

---

## Proposed Solution

### Триггеры ответа в группе (новая логика)

```typescript
// 1. Reply на сообщение бота
const isReplyToBot = replyFrom?.id === botId || replyFrom?.username === botUsername;

// 2. Reply на пост канала (через связанный чат-обсуждение)
const isReplyToChannel =
  replySenderChat?.username === channelUsername ||
  replySenderChat?.username === botUsername ||
  replySenderChat?.id === Number(process.env.CHANNEL_CHAT_ID); // числовой ID

// 3. @mention бота в тексте сообщения (НОВОЕ)
const botUsername = (await bot.api.getMe()).username;
const isMentioned = ctx.message?.text?.includes(`@${botUsername}`) ?? false;
// или через entities:
const isMentioned = ctx.message?.entities?.some(
  e => e.type === 'mention' && ctx.message!.text!.slice(e.offset, e.offset + e.length) === `@${botUsername}`
) ?? false;

// Итоговый триггер
if (!isReplyToBot && !isReplyToChannel && !isMentioned) return;
```

### Очистка текста от @упоминания перед отправкой в AI

Если сообщение начинается с `@stepka_bot`, нужно убрать упоминание перед передачей в AI:
```typescript
const cleanText = messageText.replace(new RegExp(`@${botUsername}`, 'gi'), '').trim();
```

### История переписки с разделением по чатам

Изменить ключ в `memory.ts` с `userId` на `${chatId}:${userId}`:
```typescript
// Было:
contexts.get(userId)

// Стало:
const contextKey = `${chatId}:${userId}`;
contexts.get(contextKey)
```

Это изолирует историю для каждой пары (чат, пользователь). Приватный чат: `private:${userId}`, группа: `${groupId}:${userId}`.

### Удаление/рефакторинг `activeGroupUser`

Удалить неиспользуемый Map или реализовать его назначение: отслеживать активный диалог чтобы бот отвечал на **следующие** сообщения пользователя в той же ветке без повторного reply/mention (опционально, по договорённости с пользователем — **не включено в MVP**).

### Получение `botUsername` при запуске

Кешировать один раз при инициализации, не делать `getMe()` на каждом сообщении:
```typescript
// src/botInstance.ts или src/index.ts
export let BOT_USERNAME: string;
// при старте:
const me = await bot.api.getMe();
BOT_USERNAME = me.username!;
```

---

## Acceptance Criteria

- [x] Бот отвечает на `@bot_name текст` в группе — даже без reply
- [x] Бот отвечает на reply пользователя на любое сообщение бота в группе
- [x] Бот отвечает на reply пользователя на пост из связанного канала
- [x] Бот **не** отвечает на произвольные сообщения в группе без упоминания/reply
- [x] Текст `@bot_name` вырезается из сообщения перед отправкой в AI
- [x] История переписки разделена по `chatId:userId` — нет смешения личка/группа
- [x] Персонаж Степки (ироничный кот, любит тунец, не любит Твитти) сохранён в ответах
- [x] `isReplyToChannel` корректно сравнивает числовой ID (баг с `@node_js_test` исправлен)
- [x] Ответ bot'а приходит **как reply** на исходное сообщение пользователя (`reply_parameters`)
- [x] Неиспользуемый `activeGroupUser` Map удалён или задокументирован

---

## Technical Considerations

### Архитектура — что менять

| Файл | Изменение |
|------|-----------|
| `src/bot/handlers.ts` | Переписать group handler: добавить mention detection, починить ID-баг, убрать activeGroupUser |
| `src/context/memory.ts` | Изменить ключ на `${chatId}:${userId}`, добавить параметр `chatId` в `pushToContext` / `getUserContext` |
| `src/ai/generateReply.ts` | Принимать `chatId` для контекстного ключа |
| `src/botInstance.ts` или `src/index.ts` | Кешировать `BOT_USERNAME` при старте |

### Entities vs includes для mention detection

Предпочтительнее **entities-based** подход — он точный, не ловит случайные вхождения `@username` в тексте:
```typescript
ctx.message?.entities?.some(
  e => e.type === 'mention' &&
    ctx.message!.text!.slice(e.offset, e.offset + e.length) === `@${BOT_USERNAME}`
)
```

### `reply_parameters` для ответа в группе

Telegram-best practice: в группах всегда отвечать через `reply_parameters` чтобы пользователь видел на что отвечает бот:
```typescript
await ctx.reply(answer, {
  parse_mode: 'HTML',
  reply_parameters: { message_id: ctx.message!.message_id }
});
```

### Обратная совместимость контекста

При смене ключа с `userId` на `chatId:userId` старые записи в памяти (in-memory, живут до перезапуска) станут недостижимы. Это приемлемо — история не персистируется между перезапусками.

---

## Implementation Order

1. **`src/botInstance.ts`** — добавить кеш `BOT_USERNAME`, экспортировать
2. **`src/context/memory.ts`** — изменить сигнатуры `pushToContext(chatId, userId, ...)` и `getUserContext(chatId, userId)`, обновить внутренний ключ
3. **`src/ai/generateReply.ts`** — принять `chatId` и передать в memory-функции
4. **`src/bot/handlers.ts`** — переписать группый handler:
   - Убрать `activeGroupUser`
   - Добавить `isMentioned` через entities
   - Починить `isReplyToChannel` (числовой ID)
   - Очищать текст от `@mention`
   - Передать `chatId` в `generateReply`
   - Оставить `reply_parameters`

---

## Files to Modify

- `src/bot/handlers.ts` — основные изменения
- `src/context/memory.ts` — ключ `chatId:userId`
- `src/ai/generateReply.ts` — параметр `chatId`
- `src/botInstance.ts` — кеш `BOT_USERNAME`

## Files NOT to Modify

- `src/ai/generateContent.ts` — не трогать (cron/digest пайплайн)
- `src/cron/` — не трогать
- `src/news/` — не трогать
- Логика `ctx.chat.type === 'private'` — не трогать

---

## References

- `src/bot/handlers.ts:122–195` — текущий group handler
- `src/bot/handlers.ts:119` — `activeGroupUser` Map (неиспользуемый)
- `src/bot/handlers.ts:131–134` — баг сравнения CHANNEL_ID
- `src/context/memory.ts` — in-memory контекст (keyed by userId)
- `src/ai/generateReply.ts` — AI reply flow
- Telegram Bot API: [Message entities](https://core.telegram.org/bots/api#messageentity)
- grammy docs: [Filtering](https://grammy.dev/guide/filter-queries)
