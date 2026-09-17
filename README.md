# Степка — Telegram AI Bot

Telegram-бот с несколькими независимыми модулями: чат с ИИ от лица кота Стёпы, 5-дневный цикл публикаций в канал, ежедневный дайджест событий, генерация изображений и голосовые сообщения.

---

## Модули

### 1. Чат-бот (`/src/ai/`, `/src/bot/`, `/src/context/`)

Бот отвечает на личные сообщения пользователей от лица кота Стёпы — иронично, лениво, с характером. Работает в личных чатах и в группах (по упоминанию).

- Хранит контекст последних 12 сообщений каждого пользователя в памяти
- Запоминает факты о пользователях (`data/user-memories.json`) — имя, предпочтения и т.д.
- Поддерживает голосовые сообщения (транскрибирует через OpenAI Whisper)
- Управление модулями через команду `/modules` (только для админа)

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

Текст генерируется через **Polza.ai** — единственный LLM-провайдер (OpenAI-совместимый API). Доступны две модели: обычная (`POLZA_MODEL`) и «умная» (`POLZA_SMART_MODEL`) для чата и сложных задач.

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

Команда `/generate <описание>` — генерирует изображение через Polza.ai (канал картинок `/media/create`). Лимит: 1 изображение в час на пользователя.

---

## Структура проекта

```
src/
├── index.ts                    # Точка входа, запуск кронов и бота
├── botInstance.ts              # Инициализация Grammy-бота
├── ai/
│   ├── polza.ts                # Polza.ai API клиент (OpenAI-совместимый)
│   ├── generateReply.ts        # Генерация ответов в чате (Polza)
│   ├── generateContent.ts      # Обёртка для AI-контента (Polza)
│   └── transcribe.ts           # Транскрипция аудио (Whisper)
├── bot/
│   ├── handlers.ts             # Обработчики команд и сообщений
│   ├── moduleAdminHandler.ts   # /modules — inline-кнопки управления модулями
│   ├── voiceHandler.ts         # Обработка голосовых сообщений
│   └── voiceUtils.ts           # Утилиты загрузки голоса
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
├── cron/
│   ├── dailyCycle.ts           # 5-дневный цикл (11:00)
│   └── dailyEvents.ts          # Дайджест событий (9:00)
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
│   ├── generate-image.ts       # Генерация изображений через Polza.ai
│   └── rate-limiter.ts         # Лимит запросов на пользователя
├── news/
│   ├── news.ts                 # Оркестратор котовостей
│   ├── fetch-news.ts           # Генерация текста через Polza.ai
│   ├── formatter.ts            # HTML-форматтер для Telegram
│   ├── image-generator.ts      # Иллюстрация к новости (Pollinations.ai)
│   └── news-history.ts         # История выпусков
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
| `POLZA_API_KEY` | Ключ Polza.ai (единственный LLM-провайдер) | Да |
| `POLZA_API_URL` | Base URL Polza.ai (по умолчанию `https://api.polza.ai/v1`) | Нет |
| `POLZA_MODEL` | Обычная модель (по умолчанию `deepseek/deepseek-chat-v3-0324`) | Нет |
| `POLZA_SMART_MODEL` | «Умная» модель для чата (по умолчанию `openai/gpt-4.1-nano`) | Нет |
| `ADMIN_USER_ID` | Telegram ID администратора (доступ к `/modules`) | Да |
| `OPENWEATHERMAP_API_KEY` | Погода (OpenWeatherMap, иначе Open-Meteo) | Нет |
| `GEONAMES_USERNAME` | Геолокация (GeoNames) | Нет |

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
- **[Polza.ai](https://polza.ai/dashboard/models)** — единственный LLM-провайдер (OpenAI-совместимый API)
- **[TypeScript](https://www.typescriptlang.org/)** — язык разработки
- **[PM2](https://pm2.keymetrics.io/)** — менеджер процессов для продакшна
- **Timezone**: Asia/Yekaterinburg (UTC+5, Челябинск)
