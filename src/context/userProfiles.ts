import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface DynamicUserProfile {
  userId: number;
  firstName: string;
  username?: string;
  createdAt: string;
  lastSeenAt: string;
}

function profileDir(): string {
  return join(process.cwd(), 'data', 'user-profiles');
}

function profilePath(userId: number): string {
  return join(profileDir(), `${userId}.json`);
}

export async function loadUserProfile(userId: number): Promise<DynamicUserProfile | null> {
  try {
    const raw = await readFile(profilePath(userId), 'utf-8');
    return JSON.parse(raw) as DynamicUserProfile;
  } catch {
    return null;
  }
}

export async function upsertUserProfile(
  userId: number,
  firstName: string,
  username?: string,
): Promise<DynamicUserProfile> {
  const existing = await loadUserProfile(userId);
  const now = new Date().toISOString();
  const profile: DynamicUserProfile = {
    userId,
    firstName,
    username,
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
  };
  await mkdir(profileDir(), { recursive: true });
  await writeFile(profilePath(userId), JSON.stringify(profile, null, 2), 'utf-8');
  return profile;
}
