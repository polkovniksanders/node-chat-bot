// Список отобранных YouTube-видео о животных.
// Telegram автоматически показывает превью ролика, когда URL находится в тексте сообщения.
// Добавляй новые видео в конец списка — бот будет чередовать их по кругу.

export interface YoutubeVideo {
  url: string;
  title: string;
  description: string;
}

export const YOUTUBE_VIDEOS: YoutubeVideo[] = [
  {
    url: 'https://www.youtube.com/watch?v=0Bmhjf0rKe8',
    title: 'Удивлённый котёнок',
    description:
      'Один из самых известных вирусных роликов интернета. Малюсенький котёнок реагирует на щекотку самым милым способом. Улыбка гарантирована!',
  },
  {
    url: 'https://www.youtube.com/watch?v=a1Y73sPHKxw',
    title: 'Драматический бурундук',
    description:
      'Пять секунд, которые изменили интернет. Бурундук с самым драматичным взглядом в истории мемов. Классика жанра!',
  },
  {
    url: 'https://www.youtube.com/watch?v=nGeKSiCQkPw',
    title: 'Пёс против хозяина: кто честнее?',
    description:
      'Хозяин рассказывает псу о еде, которую съел без него. Реакция собаки — настоящий театр эмоций. Более 200 миллионов просмотров!',
  },
  {
    url: 'https://www.youtube.com/watch?v=TNHK2BrMH9U',
    title: 'Выдры держатся за лапки',
    description:
      'Две выдры в аквариуме Ванкувера держатся за лапки, чтобы не уплыть друг от друга во сне. Одно из самых трогательных видео на YouTube.',
  },
  {
    url: 'https://www.youtube.com/watch?v=J---aiyznGQ',
    title: 'Кот-клавишник (Keyboard Cat)',
    description:
      'Легендарный Keyboard Cat — кот, играющий на синтезаторе. Этот мем стал одним из главных символов ранней эпохи YouTube.',
  },
  {
    url: 'https://www.youtube.com/watch?v=mHRUed3R1b4',
    title: 'Инженерное руководство по котам',
    description:
      'Двое инженеров объясняют принципы работы домашних котов с инженерной точки зрения. Остроумно, точно и очень смешно!',
  },
  {
    url: 'https://www.youtube.com/watch?v=jofNR_WkoCE',
    title: 'Что говорит лиса?',
    description:
      'Знаменитый клип Ylvis «What Does the Fox Say?» — хит с миллиардом просмотров о том, какой же звук издаёт лиса. Ответа вы не ожидаете!',
  },
  {
    url: 'https://www.youtube.com/watch?v=0M7ibPk37_U',
    title: 'Анри — философский кот',
    description:
      'Французский чёрный кот Анри размышляет об экзистенциальном кризисе под музыку Эрика Сати. Пародия на арт-хаус с котом в главной роли.',
  },
  {
    url: 'https://www.youtube.com/watch?v=tntOCGkgt98',
    title: 'Собаки против роботов-пылесосов',
    description:
      'Домашние питомцы встречают роботов-пылесосов впервые. Реакции — от паники до полного дзена. У каждого свой характер!',
  },
  {
    url: 'https://www.youtube.com/watch?v=Ez0_qFoWqiI',
    title: 'Белка берёт орехи из рук',
    description:
      'Дикая белка смело подходит к человеку и аккуратно берёт угощение прямо из ладони. Простое и трогательное видео о доверии между человеком и природой.',
  },
];

export function formatVideoPost(video: YoutubeVideo): string {
  return `🎥 <b>Видео дня</b>

<b>${video.title}</b>

${video.description}

${video.url}

#видеодня #животные #смешноевидео
<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>`;
}
