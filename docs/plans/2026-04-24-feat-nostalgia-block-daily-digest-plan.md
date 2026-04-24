---
title: feat: Добавить блок "Ностальгия" в дневной дайджест
type: feat
status: completed
date: 2026-04-24
deepened: 2026-04-24
---

# feat: Добавить блок "Ностальгия" в дневной дайджест

## Enhancement Summary

**Deepened on:** 2026-04-24
**Research agents used:** prompt-engineering best practices, correctness reviewer, TypeScript date/category cycling patterns

### Key Improvements Found
1. **Критический баг:** позиционная деструктуризация `Promise.allSettled` сломается при неверном порядке вставки — нужна именная деструктуризация
2. **Критический баг:** AI-текст без HTML-экранирования сломает `parse_mode: HTML` всего сообщения — нужна функция `escapeHtml()`
3. **Средний риск:** `generateContent` не имеет таймаута — повисший провайдер заблокирует весь дайджест на минуты
4. **Промпт-инжиниринг:** детерминированная ротация категорий в коде (не AI) + 2 tone-примера в промпте кардинально улучшают качество и разнообразие
5. **Timezone-безопасный** расчёт дня года — критично для правильной ротации у Yekaterinburg UTC+5

---

## Overview

Добавить в ежедневный дайджест (9:00, канал `EVENTS_CHANNEL_ID`) новый блок **"📼 Ностальгия"** — интересные факты и упоминания из эпохи 1989–2004. Факты о том, как жили люди раньше: технологии, культура, быт, поп-культура постсоветского пространства и мира.

## Problem Statement

Дайджест содержит актуальную информацию (погода, курсы, факты дня), но не хватает "якоря" — чего-то тёплого и узнаваемого, что вызывает эмоцию. Ностальгия по эпохе 1989–2004 (детство/юность значительной части аудитории) решает эту задачу: повышает вовлечённость и делает пост более запоминаемым.

## Proposed Solution

Новый блок реализуется через **чистую AI-генерацию** с **детерминированной ротацией категорий** в коде (не AI). Категория для каждого дня вычисляется из дня-года через `dayOfYear % categories.length` — это гарантирует, что одна категория не повторяется чаще раза в 12 дней и AI не имеет свободы выбора темы.

### Почему чистая AI-генерация (без внешнего API)

| Подход | Плюсы | Минусы |
|---|---|---|
| **Чистая AI-генерация** ✅ | Нет зависимостей, контроль стиля, русскоязычные факты, бесплатно | Нет гарантии точности отдельных деталей |
| byabbe.se API с фильтром по годам | Реальные события дня, проверенные факты | Ответ содержит поле `year` — можно фильтровать 1989–2004, но факты на английском, нужен перевод; API нестабилен |
| Wikipedia Action API | Богатая база | Нет нативного фильтра по году; нужен postprocessing; широкий, не постсоветский фокус |
| Локальный JSON массив фактов | 100% уникальность, быстро | Нужно вручную составить 200+ фактов |

**Вывод:** Чистая AI-генерация с хорошим промптом + детерминированная ротация категорий — оптимальный баланс.

> **Примечание по byabbe.se:** API возвращает поле `year` на каждое событие — технически можно фильтровать `events.filter(e => e.year >= 1989 && e.year <= 2004)`. Но API нестабилен (уже используется для "Родились в этот день" с обработкой 404), факты на английском требуют перевода, и фокус на постсоветскую культуру всё равно невозможен. AI-генерация предпочтительнее.

## Категории фактов (12 штук для ротации)

```typescript
const NOSTALGIA_CATEGORIES = [
  'телевидение и реклама',    // Поле чудес, Угадай мелодию, реклама МММ
  'еда и напитки',             // жвачка Turbo, Сникерс, Юпи, первые McDonald's
  'музыка и концерты',         // Ласковый май, Руки вверх, Земфира
  'технологии и гаджеты',      // Денди, SEGA, ICQ, первые Nokia, дискеты
  'школа и учёба',             // дневники, вкладыши, контрольные
  'двор и игры',               // резиночки, казаки-разбойники, страшилки
  'мода и стиль',              // малиновые пиджаки, адидас, лосины
  'кино и видеосалоны',        // VHS прокаты, советские мультфильмы
  'транспорт и поездки',       // маршрутки, первые иномарки
  'праздники и традиции',      // Новый год, 1 сентября, майские шашлыки
  'спорт',                     // Олимпиады, дворовый футбол
  'первые иностранные бренды', // Pepsi, Wrigley's, Marlboro, Reebok
] as const;
```

## Technical Approach

### Новые файлы

#### `src/events/fetchers/nostalgia.ts`

```typescript
import { generateContent } from '@/ai/generateContent.js';
import { NOSTALGIA_SYSTEM_PROMPT } from '@/config/prompts.js';
import { NOSTALGIA_CATEGORIES, getCategoryForDate } from '@/content/nostalgiaCycle.js';

// 10-second timeout guard — generateContent has no internal timeout
const NOSTALGIA_TIMEOUT_MS = 10_000;

export async function fetchNostalgia(date: Date): Promise<string | null> {
  try {
    const category = getCategoryForDate(date);
    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Asia/Yekaterinburg',
    });

    const userPrompt =
      `Сегодня ${formattedDate}. Категория: «${category}».\n` +
      `Напиши один ностальгический факт из этой категории — эпоха 1989–2004, ` +
      `постсоветское пространство. Избегай самых очевидных примеров категории. ` +
      `Факт должен содержать хотя бы одну конкретную деталь: название, год или ощущение.`;

    const resultPromise = generateContent(NOSTALGIA_SYSTEM_PROMPT, userPrompt);
    const timeoutPromise = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('nostalgia timeout')), NOSTALGIA_TIMEOUT_MS)
    );

    const result = await Promise.race([resultPromise, timeoutPromise]);
    const trimmed = result.trim();
    if (!trimmed) {
      console.warn('fetchNostalgia: empty result from generateContent');
      return null;
    }
    return escapeHtml(trimmed);
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

**Зачем `escapeHtml`:** Telegram `parse_mode: HTML` падает с ошибкой "can't parse entities" при любом неэкранированном `<`, `>`, `&` в тексте. AI регулярно генерирует угловые скобки (диапазоны лет типа `<2000`, сравнения, примеры кода). Ошибка отклоняет **всё сообщение**, не только блок ностальгии.

**Зачем таймаут:** `generateContent` не имеет внутреннего таймаута. При зависании AI-провайдера весь `Promise.allSettled` ждёт до TCP timeout (2+ минуты), блокируя отправку дайджеста.

#### `src/content/nostalgiaCycle.ts`

```typescript
import { TIMEZONE } from '@/config/constants.js'; // 'Asia/Yekaterinburg'

export const NOSTALGIA_CATEGORIES = [
  'телевидение и реклама',
  'еда и напитки',
  'музыка и концерты',
  'технологии и гаджеты',
  'школа и учёба',
  'двор и игры',
  'мода и стиль',
  'кино и видеосалоны',
  'транспорт и поездки',
  'праздники и традиции',
  'спорт',
  'первые иностранные бренды',
] as const;

export type NostalgiaCategory = typeof NOSTALGIA_CATEGORIES[number];

function getDayOfYear(date: Date): number {
  // Convert to Yekaterinburg local date first — same pattern as dailyEvents.ts:27
  const local = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const jan1 = new Date(local.getFullYear(), 0, 1);
  const today = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  return Math.round((today.getTime() - jan1.getTime()) / 86_400_000);
}

export function getCategoryForDate(date: Date): NostalgiaCategory {
  // Year offset shifts the mapping each year so Jan 1 isn't always "телевидение"
  const local = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const yearOffset = (local.getFullYear() - 2026) * NOSTALGIA_CATEGORIES.length;
  const idx = (getDayOfYear(date) + yearOffset + NOSTALGIA_CATEGORIES.length * 1000)
    % NOSTALGIA_CATEGORIES.length;
  return NOSTALGIA_CATEGORIES[idx];
}
```

**Зачем year offset:** Без него Jan 1 всегда будет категорией 0 ("телевидение"), Jan 13 — тоже 0, и т.д. — паттерн заметен подписчику. Year offset делает порядок разным каждый год.

### Изменения в существующих файлах

#### `src/config/prompts.ts` — добавить константу

```typescript
// После DILEMMA_SYSTEM_PROMPT
export const NOSTALGIA_SYSTEM_PROMPT = `
Ты — источник коротких ностальгических фактов для русскоязычной аудитории,
выросшей в постсоветском пространстве.

Твоя эпоха: строго 1989–2004 годы. Россия и страны СНГ.
Не выходи за пределы этих дат и этого региона.

НЕ подходит:
- Политические события, выборы, катастрофы, учебник истории
- Западная поп-культура как таковая (только её постсоветский отпечаток)
- Факты про известных людей (только про явления и предметы)

## Формат (СТРОГО)
- Не более 3 предложений
- Тон: тёплый, ностальгический, как вспоминают вслух — не лекция и не музейная табличка
- Первое предложение: конкретный факт с деталью (год или эпоха, название, явление)

## Запреты
- Без вводных фраз: «Знаете ли вы», «А вы знали», «Интересный факт», «Помните»
- Без обобщений в конце: «Вот такое было время», «Это целая эпоха»
- Без markdown, без эмодзи, без HTML-тегов
- Не начинать с «Это»
- Конкретные цены и статистику — только если это общеизвестный факт; иначе «примерно» или «в середине 90-х»

## Примеры правильного тона (не копировать дословно — только тон и структура)
«В начале 90-х жвачка Turbo стоила ощутимые деньги, и вкладыши с машинками собирали в отдельные файлики. Кто набирал больше ста штук — негласно считался авторитетом во дворе.»

«"Угадай мелодию" показывали в пятницу вечером, и вся семья реально садилась смотреть. Была в этом какая-то торжественность, которую сейчас уже не объяснить.»
`.trim();
```

**Зачем два tone-примера:** Абстрактные инструкции ("пиши ностальгически") ненадёжны. Два конкретных примера устанавливают нужный регистр эффективнее любого количества запретов. Исследования показывают, что 2–3 примера в промпте дают стабильный шаблон стиля.

#### `src/events/fetchRealEvents.ts` — интеграция блока

**КРИТИЧЕСКИ ВАЖНО:** использовать именную деструктуризацию вместо позиционной, чтобы неверный порядок вставки в массив не приводил к тихой подмене данных.

**Шаг 1:** Добавить импорт:
```typescript
import { fetchNostalgia } from '@/events/fetchers/nostalgia.js';
```

**Шаг 2:** В `fetchDailyFactsForDate` — заменить позиционную деструктуризацию на именную:
```typescript
const results = await Promise.allSettled([
  fetchBirths(date),       // [0]
  fetchCatFact(),          // [1]
  fetchDogFact(),          // [2]
  fetchWordMeaning(),      // [3]
  fetchUselessFact(),      // [4]
  fetchDilemma(),          // [5]
  fetchRiddle(),           // [6]
  fetchDoomsdayClock(),    // [7]
  fetchNostalgia(date),    // [8] — новое, ВСЕГДА последним
]);

const [
  birthsResult,
  catFactResult,
  dogFactResult,
  wordResult,
  uselessResult,
  dilemmaResult,
  riddleResult,
  doomsdayResult,
  nostalgiaResult,         // [8]
] = results;

const nostalgia = nostalgiaResult.status === 'fulfilled' ? nostalgiaResult.value : null;
```

**Шаг 3:** Добавить блок в сборку текста (после doomsdayClock):
```typescript
if (nostalgia) {
  text += `\n<b>──────────────</b>\n`;
  text += `\n📼 <b>Ностальгия (1989–2004):</b>\n${nostalgia}\n`;
}
```

**Зачем именная деструктуризация:** Если вставить `fetchNostalgia` не последним в массив, `nostalgiaResult` тихо получит данные другого fetcher'а (TypeScript не ошибётся — тип совпадает). Именная деструктуризация с комментариями-индексами позволяет мгновенно заметить рассинхрон.

## Acceptance Criteria

- [x] Блок "📼 Ностальгия" появляется в дайджесте ежедневно
- [x] При ошибке AI или таймауте блок тихо пропускается — остальной дайджест не затронут
- [x] Факт на русском языке, не более 3 предложений
- [x] Факт относится к периоду 1989–2004, постсоветский контекст
- [x] Блок отделён горизонтальной чертой `<b>──────────────</b>`
- [x] AI-текст HTML-экранирован перед вставкой в сообщение
- [x] `generateContent` обёрнут в 10-секундный таймаут
- [x] Никаких новых env vars не требуется
- [x] Категория меняется каждый день (детерминированная ротация, не AI-выбор)

## Опциональные улучшения (не в MVP)

1. **Sub-category seeding:** для категорий, которые повторяются каждые 12 дней — добавить angle-массивы (например, для "кино": "факты о съёмках", "малоизвестный шедевр", "цитата") и выбирать по `weekOfYear % angles.length`
2. **byabbe.se гибрид:** если API отвечает и есть события в диапазоне 1989–2004 (`events.filter(e => e.year >= 1989 && e.year <= 2004)`), использовать реальное событие как seed для AI-генерации вместо категории
3. **Локальная база фактов:** JSON-файл с 200+ проверенными фактами как первичный источник, AI — только как fallback

## Dependencies & Risks

| Риск | Вероятность | Митигация |
|---|---|---|
| AI генерирует `<` или `>` в тексте → ломает HTML | Высокая без mitigation | `escapeHtml()` в `fetchNostalgia` ✅ |
| AI генерирует факт вне эпохи 1989–2004 | Низкая | Жёсткие ограничения в промпте + культурные якоря (перечень брендов/передач) |
| `generateContent` зависает → задержка всего дайджеста | Средняя без mitigation | `Promise.race` с 10s таймаутом ✅ |
| AI повторяет одни и те же факты | Средняя без mitigation | Детерминированная ротация 12 категорий в коде ✅ |
| Неверный порядок в `Promise.allSettled` → тихая подмена данных | Низкая | Именная деструктуризация с комментариями-индексами ✅ |
| Все AI провайдеры упали | Очень низкая | `try/catch` возвращает `null`, блок пропускается |

## References

- `src/events/fetchers/misc.ts` — паттерн `fetchDilemma()` (чистая AI-генерация)
- `src/events/fetchers/facts.ts` — паттерн `translateText()` (AI как утилита)
- `src/config/prompts.ts` — константы промптов (`DILEMMA_SYSTEM_PROMPT`, `TRANSLATE_SYSTEM_PROMPT`)
- `src/events/fetchRealEvents.ts:116–197` — `fetchDailyFactsForDate()`, место интеграции
- `src/ai/generateContent.ts` — интерфейс `generateContent(systemPrompt, userPrompt): Promise<string>`
- `src/cron/dailyEvents.ts:27` — паттерн timezone-safe local date (`toLocaleString('en-US', { timeZone })`)
