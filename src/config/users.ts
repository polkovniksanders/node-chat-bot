export interface RegisteredUser {
  id: number;
  username?: string;
  firstName: string;
  description: string;
}

export const REGISTERED_USERS: RegisteredUser[] = [
  {
    id: 942510836,
    username: 'Eset74',
    firstName: 'Андрей',
    description:
      'Замечательный друг и любитель кальяна. Стильно одевается и очень уважает свою семью и друзей',
  },
  {
    id: 5492444,
    username: 'berghub',
    firstName: 'Слава',
    description:
      'Мужчина ближе к 40 годам. Работает удалённо, женат. В общении может быть резковатым или ироничным, но в основе доброжелательный и готов помочь. Предпочитает прямоту и простоту без лишнего официоза. Хорошо воспринимает лёгкий юмор, но с уважением к границам. Ожидает адекватного, неформального, но корректного общения. Занимается бегом и безуспешно ищет работу. Любит халву и сгущенку',
  },
];

export function findUserById(id: number): RegisteredUser | undefined {
  return REGISTERED_USERS.find((u) => u.id === id);
}

export function getRandomUser(): RegisteredUser | undefined {
  if (REGISTERED_USERS.length === 0) return undefined;
  return REGISTERED_USERS[Math.floor(Math.random() * REGISTERED_USERS.length)];
}
