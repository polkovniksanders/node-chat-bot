# Степка — Telegram AI Bot

Telegram-бот с несколькими независимыми модулями: чат с ИИ от лица кота Стёпы, 5-дневный цикл публикаций в канал, ежедневный дайджест событий, генерация изображений и голосовые сообщения.

---

## Модули

### 1. Чат-бот (`/src/ai/`, `/src/bot/`, `/src/context/`)

Бот отвечает на личные сообщения пользователей от лица кота Стёпы — иронично, лениво, с характером. Работает в личных чатах и в группах (по упоминанию).

- Хранит контекст последних 12 сообщений каждого пользователя в памяти
- Запоминает факты о пользователях (`data/user-memories.json`) — имя, предпочтения и т.д.
- Поддерживает голосовые сообщения (транскрибирует через OpenAI Whisper)
- Поддерживает команду `/say` — Степка озвучивает текст голосом

### 2. 5-дневный цикл публикаций (`/src/cron/dailyCycle.ts`)

Каждый день в **11:00 по Челябинску** публикует в Telegram-канал пост по циклу:

| День | Тип поста |
|------|-----------|
| 1 | **Котовости** — AI-новость в стиле Стёпы + иллюстрация + `#котовости` |
| 2 | **Фильм про животных** — один из 23 реальных фильмов + комментарий Стёпы + `#кинопрождивотных` |
| 3 | **YouTube видео** — ссылка с превью из подборки + `#видеодня` |
| 4 | **Клички для животных** — 5 необычных AI-придуманных кличек + `#кличкидляживотных` |
| 5 | **Рассказ** — AI-рассказ про животных 150–200 слов + `#рассказдня` |

Состояние цикла хранится в `data/cycle-state.json`.

#### Котовости: как работает генерация

Чтобы посты не повторялись, перед генерацией случайно выбираются параметры (место, время суток, тема, тон, эмоция). Параметры последних 14 выпусков передаются в промпт как запрещённые. История хранится в `data/news-history.json`.

Тоны: официальный репортаж, паника, светская хроника, псевдонаучный, жалоба в ЖЭК, стихи, советская газета, детектив, кулинарный обзор, спортивный репортаж.

Генерация работает через цепочку провайдеров — если один недоступен, автоматически переходит к следующему:

| Приоритет | Провайдер |
|-----------|-----------|
| 1 | GPTunnel (основной, дешёвый) |
| 2 | Anthropic (Claude Haiku) |
| 3 | HuggingFace (DeepSeek-R1) |
| 4 | HuggingFace (Qwen 2.5 72B) |
| 5 | HuggingFace (Llama 3.3 70B) |
| 6 | HuggingFace (Mistral Small 24B) |
| 7 | HuggingFace (Gemma) |
| 8 | Groq (Llama 3.3 70B) |
| 9 | OpenRouter (DeepSeek) |
| 10 | OpenAI (GPT-4o-mini) |
| 11 | Google Gemini |

### 3. Дайджест событий (`/src/cron/dailyEvents.ts`)

Каждый день в **9:00 по Челябинску** публикует в отдельный канал (EVENTS_CHANNEL_ID) дайджест:

- **8:55** — фото кофе с приветствием
- **9:00** — текстовый дайджест:
  1. Дата + тип дня (рабочий / выходной)
  2. Памятные даты (OpenHolidays API + calend.ru)
  3. Место дня (GeoNames → fallback: 25 кураторских городов)
  4. Погода в Челябинске и месте дня (OpenWeatherMap → Open-Meteo)
  5. Факт о кошках (catfact.ninja, переведён AI)
  6. Факт о собаках (dogapi.dog, переведён AI)
  7. Слово дня (dictionaryapi.dev, переведено AI)
  8. Родились в этот день (byabbe.se)
  9. Факт дня (uselessfacts.jsph.pl, переведён AI)

### 4. Генерация изображений (`/src/generate/`)

Команда `/generate <описание>` — генерирует изображение через DALL-E. Лимит: 3 изображения в час на пользователя.

---

## Структура проекта

```
src/
├── index.ts                    # Точка входа, запуск кронов и бота
├── botInstance.ts              # Инициализация Grammy-бота
├── ai/
│   ├── generateReply.ts        # Генерация ответов в чате (GPTunnel)
│   ├── generateContent.ts      # Обёртка для AI-контента с fallback
│   ├── gptunnel.ts             # GPTunnel API клиент
│   ├── openrouter.ts           # OpenRouter API клиент
│   └── transcribe.ts           # Транскрипция аудио (Whisper)
├── bot/
│   ├── handlers.ts             # Обработчики команд и сообщений
│   ├── voiceHandler.ts         # Обработка голосовых сообщений
│   ├── voiceUtils.ts           # Утилиты загрузки голоса
│   ├── soraHandler.ts          # Обработчик /sora
│   └── sayHandler.ts           # Обработчик /say (TTS)
├── config/
│   ├── prompts.ts              # Промпты (персонаж Стёпы и все тексты)
│   ├── api.ts                  # URL API и таймауты
│   ├── constants.ts            # Глобальные константы
│   └── users.ts                # База пользователей
├── context/
│   ├── memory.ts               # История диалогов (in-memory)
│   └── userMemory.ts           # Факты о пользователях (JSON)
├── content/
│   ├── cycleState.ts           # Трекинг дня цикла
│   ├── animalMovies.ts         # 23 фильма про животных
│   ├── animalStory.ts          # AI-генерация рассказа
│   ├── petNames.ts             # AI-генерация кличек
│   ├── youtubeVideos.ts        # Подборка YouTube-видео
│   ├── soraPost.ts             # Sora видео-контент
│   └── soraQueue.ts            # Очередь Sora
├── cron/
│   ├── dailyCycle.ts           # 5-дневный цикл (11:00)
│   ├── dailyEvents.ts          # Дайджест событий (9:00)
│   └── soraVideoCron.ts        # Крон Sora-видео
├── events/
│   ├── events.ts               # Точка входа событий
│   ├── fetchRealEvents.ts      # Оркестратор всех API
│   └── fetchers/
│       ├── facts.ts            # Факты о кошках, собаках, слово дня
│       ├── holidays.ts         # Праздники и выходные дни
│       ├── investments.ts      # Инвест-данные, Fear & Greed
│       ├── misc.ts             # Рождения, курсы, восход, загадки
│       ├── movieOfDay.ts       # Фильм дня
│       ├── trackOfDay.ts       # Трек дня
│       └── weather.ts          # Погода и геолокация
├── generate/
│   ├── generate-image.ts       # Генерация изображений DALL-E
│   └── rate-limiter.ts         # Лимит запросов на пользователя
├── news/
│   ├── news.ts                 # Оркестратор котовостей
│   ├── fetch-news.ts           # Цепочка провайдеров
│   ├── formatter.ts            # HTML-форматтер для Telegram
│   ├── image-generator.ts      # Иллюстрация к новости
│   ├── news-history.ts         # История выпусков
│   └── providers/              # AI-провайдеры
│       ├── anthropic.ts
│       ├── openAI.ts
│       ├── gemini.ts
│       ├── groq.ts
│       ├── gptunnel.ts
│       ├── openRouter.ts
│       └── huggingface.ts
├── weather/
│   ├── fetch-weather.ts        # OpenWeatherMap клиент
│   └── formatter.ts            # Форматирование погоды
└── types/
    └── index.ts                # TypeScript-типы

data/
├── news-history.json           # История котовостей (авто)
├── cycle-state.json            # Текущий день цикла (авто)
└── user-memories.json          # Запомненные факты о пользователях (авто)
```

---

## Переменные окружения

Создайте `.env` по образцу `.env.example`:

| Переменная | Описание | Обязательна |
|------------|----------|-------------|
| `TELEGRAM_TOKEN` | Токен бота от @BotFather | Да |
| `CHANNEL_ID` | ID канала для публикаций (напр. `@my_channel`) | Да |
| `EVENTS_CHANNEL_ID` | ID канала/группы для дайджеста событий | Нет |
| `GPTUNNEL_API_KEY` | Ключ GPTunnel (основной AI-провайдер) | Рекомендуется |
| `ANTHROPIC_API_KEY` | Ключ Anthropic Claude | Нет |
| `OPENAI_API_KEY` | Ключ OpenAI (DALL-E + GPT) | Нет |
| `GEMINI_API_KEY` | Ключ Google Gemini | Нет |
| `OPENROUTER_API_KEY` | Ключ OpenRouter | Нет |
| `GROQ_API_KEY` | Ключ Groq | Нет |
| `HF_TOKEN` | Токен HuggingFace | Нет |
| `OPENWEATHERMAP_API_KEY` | Погода (OpenWeatherMap) | Нет |
| `GEONAMES_USERNAME` | Геолокация (GeoNames) | Нет |

Хотя бы один AI-провайдер должен быть настроен.

---

## Запуск

```bash
# Установка зависимостей
npm install

# Разработка (с hot reload)
npm run dev

# Сборка
npm run build

# Продакшн
npm start
```

### Тестовые скрипты

```bash
npm run test-cycle       # Тест 5-дневного цикла
npm run test-events      # Тест дайджеста событий
npm run test-investments # Тест инвест-данных
```

---

## Деплой

Проект настроен для запуска через PM2 (`ecosystem.config.cjs`):

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Стек

- **[grammy](https://grammy.dev/)** — Telegram Bot Framework
- **[node-cron](https://github.com/node-cron/node-cron)** — планировщик задач
- **[TypeScript](https://www.typescriptlang.org/)** — язык разработки
- **[openai](https://github.com/openai/openai-node)** — SDK для OpenAI / DALL-E / Whisper
- **[@google/generative-ai](https://github.com/google-gemini/generative-ai-js)** — Google Gemini SDK
- **[PM2](https://pm2.keymetrics.io/)** — менеджер процессов для продакшна
- **Timezone**: Asia/Yekaterinburg (UTC+5, Челябинск)