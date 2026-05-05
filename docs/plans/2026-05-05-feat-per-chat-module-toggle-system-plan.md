---
title: Per-Chat Module Toggle System
type: feat
status: completed
date: 2026-05-05
---

# feat: Per-Chat Module Toggle System

## Overview

Бот Степка сейчас работает с единым набором включённых функций для всех чатов. Требуется:
1. Разбить функционал на 13 дискретных модулей
2. Дать возможность включать/выключать каждый модуль отдельно по `chatId`
3. Управление доступно только администраторам бота (список ID из `.env`)
4. Состояние персистируется в `data/module-config.json`

---

## Модули (13 штук)

Модули делятся на три класса с принципиально разной семантикой `chatId`:

### Класс A — Cron-модули (singleton, привязаны к выходному каналу)

| Модуль | Ключ toggle chatId | Описание |
|---|---|---|
| `daily-cycle` | `process.env.CHANNEL_ID` | 5-дневный цикл постов: котовости, фильмы, видео, клички, рассказы |
| `daily-events` | `process.env.EVENTS_CHANNEL_ID` | Утренний дайджест: кофе-фото, факты, финансы, культура |
| `sora-videos` | `process.env.CHANNEL_ID` | Постинг Sora-видео из очереди |

**Ключевое решение:** cron-модули всегда остаются в планировщике. При срабатывании они читают конфиг и делают ранний выход (`return`) если выключены. Динамическое удаление/восстановление крона — не нужно.

**chatId для cron-модулей** = числовой ID выходного канала из `.env`. Команда `/module_disable daily-cycle` без аргумента автоматически использует `CHANNEL_ID`. При указании `chatId` — валидировать, что он совпадает с известным выходным каналом модуля.

### Класс B — Input-модули (по chatId разговора)

| Модуль | Описание |
|---|---|
| `ai-chat` | AI-ответы на @упоминания, реплаи, и всё в личных сообщениях |
| `voice-transcription` | Авто-транскрипция в личках + команда `/transcribe` |
| `image-generation` | Команда `/generate` |
| `weather` | Команда `/weather` + "погода" в личных сообщениях |
| `secret-whisper` | Команда `/secret` — отправка анонимных сообщений в EVENTS_CHANNEL_ID |
| `events-manual` | Команда `/events` — ручной триггер дайджеста |
| `emoji-reactions` | 15% шанс случайной emoji-реакции в группах |
| `user-memory` | AI-экстракция и хранение фактов о пользователях |

### Класс C — Admin-модули (работают только в DM с админом)

| Модуль | Описание |
|---|---|
| `sora-admin` | Загрузка Sora-видео в очередь через DM |
| `say-admin` | Команда `/say` — отправить сообщение случайному пользователю |

---

## Техническая реализация

### Структура конфига

```json
// data/module-config.json
{
  "-1001234567890": {
    "daily-cycle": false,
    "emoji-reactions": false
  },
  "-1002356703279": {
    "daily-events": false
  }
}
```

**Семантика:** файл хранит только **переопределения** (отклонения от дефолта). Отсутствие записи = модуль включён (дефолт). Это минимизирует размер файла и упрощает добавление новых модулей без миграций.

### Новые файлы

```
src/modules/
  moduleConfig.ts     — загрузка/сохранение конфига, isEnabled(chatId, module)
  moduleRegistry.ts   — список всех модулей с метаданными (имя, описание, класс, chatId по умолчанию)
  moduleAdmin.ts      — обработчик команд /module_* (парсинг, валидация, применение)
```

### `src/modules/moduleConfig.ts`

```typescript
// Типы
type ModuleName = 'daily-cycle' | 'daily-events' | 'sora-videos' | 
  'ai-chat' | 'voice-transcription' | 'image-generation' | 'weather' |
  'secret-whisper' | 'events-manual' | 'emoji-reactions' | 'user-memory' |
  'sora-admin' | 'say-admin';

type ModuleConfig = Record<string, Partial<Record<ModuleName, boolean>>>;

// Публичный API
function isEnabled(chatId: string, module: ModuleName): boolean
async function setEnabled(chatId: string, module: ModuleName, enabled: boolean): Promise<void>
function getStatus(chatId: string): Record<ModuleName, boolean>
```

**Безопасность при конкурентных записях:** все write-операции проходят через async-очередь (promise chain) на уровне модуля. Запись через `writeFile` → `rename` (атомарно).

**Bootstrap:** если файл отсутствует или повреждён (JSON.parse throws) — логируем warning, продолжаем работу с дефолтом всё-включено. Не крашим бот.

### `src/modules/moduleRegistry.ts`

```typescript
interface ModuleDefinition {
  name: ModuleName;
  description: string;
  class: 'cron' | 'input' | 'admin';
  defaultChatId?: string; // для cron-модулей
}

const MODULES: ModuleDefinition[] = [
  { name: 'daily-cycle', class: 'cron', defaultChatId: process.env.CHANNEL_ID, ... },
  // ...все 13 модулей
];
```

### Admin-команды

Новый обработчик регистрируется в `src/bot/handlers.ts` (или отдельный `src/bot/moduleAdminHandler.ts`).

**Команды:**
- `/module_enable <module> [chatId]` — включить модуль
- `/module_disable <module> [chatId]` — выключить модуль
- `/module_status [chatId]` — показать статус всех модулей
- `/module_list` — список всех доступных модулей с описаниями

**Условия доступа:**
- `from.id` должен быть в `ADMIN_USER_IDS` (только числовой ID, не username)
- Работает в любом контексте (DM или группа) — но для cron-модулей `chatId` автоматически берётся из env
- Если `ADMIN_USER_IDS` не задан — команды игнорируются для всех (fail-safe)

**chatId resolution:**
- Для cron-модулей: если аргумент `chatId` не передан, используется дефолтный chatId модуля из реестра
- Для cron-модулей: если `chatId` передан — валидировать что он совпадает с `defaultChatId`, иначе ошибка
- Для input-модулей: если `chatId` не передан — используется `ctx.chat.id` текущего разговора
- Принимать как числовые ID (`-1001234567890`), так и @username (резолвить через Telegram API)

**Пример ответов бота:**
```
/module_disable daily-cycle
→ ✅ Модуль daily-cycle выключен для @stepka_and_twitty

/module_status
→ 📋 Статус модулей для чата -1001234567890:
  ✅ ai-chat
  ✅ voice-transcription
  ❌ emoji-reactions (выключен)
  ...

/module_list
→ 📦 Доступные модули:
  daily-cycle — 5-дневный цикл постов [cron]
  ...
```

### Интеграция с существующим кодом

#### Cron-модули

```typescript
// src/cron/dailyCycle.ts
export function setupDailyCycleCron() {
  cron.schedule('...', async () => {
    if (!isEnabled(process.env.CHANNEL_ID!, 'daily-cycle')) return;
    // ... существующий код
  });
}
```

#### Input-модули

```typescript
// src/bot/handlers.ts
bot.on('message:text', async (ctx) => {
  const chatId = String(ctx.chat.id);
  
  if (!isEnabled(chatId, 'ai-chat')) return; // или пропускаем блок
  // ... существующий код
});
```

#### emoji-reactions

```typescript
// src/bot/reactions.ts — вызывается из handlers.ts
if (isEnabled(chatId, 'emoji-reactions') && Math.random() < 0.15) {
  await sendRandomReaction(ctx);
}
```

---

## Зависимости между модулями

| Ситуация | Поведение |
|---|---|
| `ai-chat` выключен, `user-memory` включён | Память не извлекается (нет входящих для обработки) |
| `ai-chat` включён, `user-memory` выключён | Чат работает, персонализации нет, старые воспоминания не читаются |
| `daily-events` выключен, `events-manual` включён | `/events` работает, крон — нет (независимые переключатели) |
| `secret-whisper` | Один глобальный переключатель: отключить в конкретном чате-источнике |

`user-memory` проверяется внутри `generateReply`, только если `ai-chat` включён — двойная проверка не нужна.

---

## Edge-Cases и их решения

### EC-1: Повреждённый `module-config.json`

**Что делаем:** перехватываем `JSON.parse` ошибку → логируем `warn` → продолжаем с пустым конфигом (все модули включены). Не крашим бот, не теряем уже работающий функционал.

### EC-2: Конкурентные записи в конфиг

**Что делаем:** promise-chain мьютекс на уровне модуля `moduleConfig.ts`. Все `setEnabled()` вызовы попадают в очередь. Запись — атомарная через temp-файл + `rename`.

### EC-3: Новый чат без конфига

**Поведение:** отсутствие ключа = модуль включён (lazy default). `/module_status` явно указывает `(дефолт)` рядом с модулями без явной настройки.

### EC-4: Неверный `chatId` для cron-модуля

**Что делаем:** если передан `chatId` не совпадающий с `defaultChatId` модуля — возвращаем сообщение об ошибке с подсказкой: `❌ Модуль daily-cycle работает только с каналом @stepka_and_twitty. Используй /module_disable daily-cycle без chatId`.

### EC-5: Пустой или отсутствующий `ADMIN_USER_IDS`

**Что делаем:** при старте логируем `warn: ADMIN_USER_IDS не задан — управление модулями недоступно`. Admin-команды тихо игнорируются (не возвращают ошибку — не раскрываем что команда существует).

### EC-6: Не-админ пытается использовать admin-команду

**Что делаем:** тихо игнорируем (no response). Не отвечаем "нет доступа" — не подтверждаем существование команды.

### EC-7: `secret-whisper` — нельзя заблокировать все источники одной командой

**Ограничение:** т.к. `/secret` принимается из любого чата, отключить нужно в каждом чате отдельно. Это приемлемо при текущем масштабе (бот в небольшом числе чатов). Глобальный override — вне скоупа MVP.

### EC-8: Bot добавлен в новый чат

**Поведение:** никаких действий при `my_chat_member` событии. Lazy default — всё включено. При первом `/module_status` — показываем все модули как `✅ (дефолт)`.

### EC-9: `say-admin` — DM заблокированному пользователю

**Что делаем:** оборачиваем `sendMessage` в try/catch, логируем 403 ошибку, продолжаем (не крашим). Это уже в существующем коде — просто убеждаемся что проверка moduel toggle не сломала flow.

### EC-10: @username вместо числового chatId в команде

**Что делаем:** если аргумент начинается с `@` — пробуем резолвить через `bot.api.getChat(username)`. При ошибке — сообщаем администратору.

---

## Acceptance Criteria

### Функциональные требования

- [x] Все 13 модулей идентифицированы в `moduleRegistry.ts` с правильным классом (cron/input/admin)
- [x] `isEnabled(chatId, module)` возвращает `true` по умолчанию для любого неизвестного chatId
- [x] `setEnabled()` персистирует изменение и оно выживает перезапуск бота
- [x] Cron-модули проверяют `isEnabled` при каждом срабатывании и делают early return если выключены
- [x] Input-модули проверяют `isEnabled` до обработки сообщения
- [x] `/module_enable`, `/module_disable` работают только для `from.id` из `ADMIN_USER_IDS`
- [x] `/module_status` без аргумента показывает статус для текущего чата
- [x] `/module_list` показывает все 13 модулей с описаниями
- [x] Не-admin получает тихий игнор (no response) на admin-команды
- [x] Повреждённый конфиг-файл не крашит бот при старте

### Нефункциональные требования

- [x] Все записи конфига атомарные (нет risk корраптнутого файла при crash во время записи)
- [x] Конкурентные `setEnabled()` не теряют данные (async queue)
- [x] Существующее поведение бота не изменяется до тех пор, пока явно не выключить модуль

---

## Зависимости и риски

**Зависимости:**
- Нет новых npm-пакетов. Используем только Node.js fs/promises
- Все существующие модули должны импортировать `isEnabled` — это касается всех cron-файлов и `handlers.ts`

**Риски:**
- Большой diff — затрагивает все файлы с обработчиками. Тщательный review нужен для каждого модуля
- Пропущенная проверка в одном месте = модуль остаётся всегда включённым (silent bug)
- Рекомендация: добавить unit-тесты для `isEnabled` и интеграционные тесты для admin-команд

---

## Порядок реализации

### Фаза 1: Инфраструктура (независимо тестируема)
1. `src/modules/moduleConfig.ts` — config IO с мьютексом и fallback
2. `src/modules/moduleRegistry.ts` — реестр всех 13 модулей
3. Тест: убедиться что дефолт=enabled, persist работает, корраптный файл не крашит

### Фаза 2: Admin-интерфейс
4. `src/bot/moduleAdminHandler.ts` — команды `/module_*`
5. Регистрация в `src/index.ts` через `setupHandlers(bot)`
6. Тест: admin команды работают, non-admin игнорируется

### Фаза 3: Интеграция с cron-модулями
7. `src/cron/dailyCycle.ts` — добавить `isEnabled` check
8. `src/cron/dailyEvents.ts` — добавить `isEnabled` check  
9. `src/cron/soraVideoCron.ts` — добавить `isEnabled` check

### Фаза 4: Интеграция с input-модулями
10. `src/bot/handlers.ts` — ai-chat, image-generation, weather, events-manual, emoji-reactions, user-memory
11. `src/bot/voiceHandler.ts` + `src/bot/whisperHandler.ts` — voice-transcription, secret-whisper
12. `src/bot/soraHandler.ts` + `src/bot/sayHandler.ts` — sora-admin, say-admin (уже есть admin check, добавить module check)

---

## Конфигурация `.env`

```env
# Существующее
ADMIN_USER_ID=123456789

# Новое: несколько админов через запятую
ADMIN_USER_IDS=123456789,987654321
```

**Обратная совместимость:** читаем оба `ADMIN_USER_ID` (старый, singular) и `ADMIN_USER_IDS` (новый, plural), объединяем в один Set.

---

## Ссылки

### Internal

- `src/index.ts` — точка входа, регистрация хендлеров и кронов
- `src/cron/dailyCycle.ts` — 5-дневный цикл
- `src/cron/dailyEvents.ts` — дайджест
- `src/cron/soraVideoCron.ts` — Sora-видео
- `src/bot/handlers.ts` — главный обработчик сообщений
- `src/bot/voiceHandler.ts` — транскрипция
- `src/bot/whisperHandler.ts` — анонимные whisper + /transcribe
- `src/bot/soraHandler.ts` — admin Sora upload
- `src/bot/sayHandler.ts` — admin /say
- `src/bot/reactions.ts` — emoji-реакции
- `src/ai/generateReply.ts` — ai-chat + user-memory интеграция
- `data/module-config.json` — персистентный конфиг (создаётся автоматически)
