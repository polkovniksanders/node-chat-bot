export interface RegisteredUser {
  id: number;
  username?: string;
  firstName: string;
  description: string;
}

// Добавляй пользователей сюда:
export const REGISTERED_USERS: RegisteredUser[] = [
  {
    id: 388280667,
    username: 'rmmm317',
    firstName: 'Резида',
    description:
      'Женщина 30-40 лет. Замужем, живёт в Челябинске. Держит дома попугая и кота — то есть прекрасно понимает котячью жизнь изнутри. Очень добрая и отзывчивая, но умеет схитрить когда надо. Любит животных, скорее всего балует своих питомцев.',
  },
  {
    id: 151662517,
    username: 'SyskovMikhail',
    firstName: 'Отец Михаил',
    description:
      'Мужчина ближе к 40 годам. Женат. Самый умный и уважаемый человек в группе — это все признают, хотя вслух не всегда говорят. Солидный, взвешенный, любит когда всё по делу. На все руки мастер. Любит грильяж',
  },
  {
    id: 942510836,
    username: 'Eset74',
    firstName: 'Андрей',
    description:
      'Мужчина ближе к 40 годам. В прошлом крипто-олигарх, сейчас возит людей в бизнес-такси — жизнь повернула неожиданно. Женат, недавно родилась дочь. Очень вежливый, даже когда тема скользкая. Знает цену деньгам с обеих сторон.',
  },
  {
    id: 302847353,
    username: 'EvgeniyaZ74',
    firstName: 'Евгения',
    description:
      'Женщина около 40 лет. Замужем, недавно родилась дочь — так что сейчас жизнь вертится вокруг младенца и недосыпа. Очень скрытная: многое замечает, но не говорит. Немного загадочная.',
  },
  {
    id: 261770187,
    username: 'SelivanovaAS',
    firstName: 'Алена',
    description:
      'Женщина около 40 лет. Замужем, есть дочь. Работает очень много и чрезмерно ответственная — из тех людей, которые доделают всё сами если надо. Вероятно устаёт, но не жалуется.',
  },
  {
    id: 5492444,
    username: 'berghub',
    firstName: 'Слава',
    description:
      'Мужчина ближе к 40 годам. Работает на удалёнке, женат. Хамоватый на словах, но добрый по сути — из тех кто ворчит но всегда поможет. Скорее всего сидит дома с чаем и что-то кодит.',
  },
];

export function findUserById(id: number): RegisteredUser | undefined {
  return REGISTERED_USERS.find((u) => u.id === id);
}

export function getRandomUser(): RegisteredUser | undefined {
  if (REGISTERED_USERS.length === 0) return undefined;
  return REGISTERED_USERS[Math.floor(Math.random() * REGISTERED_USERS.length)];
}
