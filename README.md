# Степка — Telegram AI Bot

Telegram-бот с тремя независимыми модулями: чат с ИИ от лица кота Стёпы, ежедневные котовости и дайджест событий дня.

---

## Модули

### 1. Чат-бот (`/src/ai/`, `/src/bot/`, `/src/context/`)
Бот отвечает на личные сообщения пользователей, играя роль кота Стёпы. Использует модель DeepSeek через OpenRouter. Хранит контекст последних 12 сообщений каждого пользователя в памяти.

### 2. Котовости (`/src/news/`)
Каждый день в **11:00 по Челябинску** генерирует одну новость от лица Стёпы и публикует в Telegram-канал. Чтобы новости не повторялись:
- Перед генерацией случайно выбираются параметры (место, время суток, тема, эмоция)
- Параметры последних 14 выпусков передаются в промпт как запрещённые
- История хранится в `data/news-history.json`

Генерация работает через цепочку провайдеров — если один недоступен, автоматически переходит к следующему:

| Приоритет | Провайдер |
|-----------|-----------|
| 1 | Anthropic (Claude Haiku) |
| 2 | HuggingFace (DeepSeek-R1) |
| 3 | HuggingFace (Qwen 2.5 72B) |
| 4 | HuggingFace (Llama 3.3 70B) |
| 5 | HuggingFace (Mistral Small 24B) |
| 6 | HuggingFace (Phi-4) |
| 7 | Groq (Llama 3.3 70B) |
| 8 | OpenRouter (DeepSeek) |
| 9 | OpenAI (GPT-4o-mini) |
| 10 | Google Gemini |

### 3. События дня (`/src/events/`)
Каждый день в **9:00 по Челябинску** публикует в группу дайджест праздников и исторических событий на эту дату. Данные берутся из Wikipedia API (без использования ИИ).

---

## Структура проекта

```
src/
├── index.ts                  # Точка входа, инициализация модулей
├── botInstance.ts            # Инициализация Telegram-бота (grammy)
├── ai/
│   ├── generateReply.ts      # Генерация ответов в чате
│   └── openrouter.ts         # HTTP-клиент для OpenRouter API
├── bot/
│   └── handlers.ts           # Обработчики сообщений Telegram
├── config/
│   └── prompts.ts            # Промпты и их сборка
├── context/
│   └── memory.ts             # Хранение контекста диалога (in-memory)
├── cron/
│   ├── dailyNews.ts          # Крон котовостей (11:00)
│   └── dailyEvents.ts        # Крон событий дня (9:00)
├── events/
│   ├── events.ts             # Точка входа модуля событий
│   └── fetchRealEvents.ts    # Парсинг Wikipedia API
├── news/
│   ├── news.ts               # Точка входа модуля новостей
│   ├── fetch-news.ts         # Цепочка провайдеров с fallback
│   ├── formatter.ts          # Форматирование дайджеста для Telegram
│   ├── news-history.ts       # История выпусков + генерация параметров
│   └── providers/            # Адаптеры под каждый AI-провайдер
│       ├── anthropic.ts
│       ├── openAI.ts
│       ├── gemini.ts
│       ├── groq.ts
│       ├── openRouter.ts
│       └── huggingface.ts
└── types/
    └── index.ts              # Общие TypeScript-типы

data/
└── news-history.json         # История котовостей (создаётся автоматически)
```

---

## Переменные окружения

Создайте `.env` по образцу `.env.example`:

| Переменная | Описание | Обязательна |
|------------|----------|-------------|
| `TELEGRAM_TOKEN` | Токен бота от @BotFather | Да |
| `CHANNEL_ID` | ID канала для котовостей (напр. `@my_channel`) | Да |
| `EVENTS_CHANNEL_ID` | ID группы для событий дня | Нет |
| `ANTHROPIC_API_KEY` | Ключ Anthropic (приоритетный провайдер) | Нет |
| `OPENAI_API_KEY` | Ключ OpenAI | Нет |
| `GEMINI_API_KEY` | Ключ Google Gemini | Нет |
| `OPENROUTER_API_KEY` | Ключ OpenRouter | Нет |
| `GROQ_API_KEY` | Ключ Groq | Нет |
| `HF_TOKEN` | Токен HuggingFace | Нет |

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

# Продакшн (через PM2)
npm start
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
- **[PM2](https://pm2.keymetrics.io/)** — менеджер процессов для продакшна
- **[Wikimedia API](https://api.wikimedia.org/)** — события дня
