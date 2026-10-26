export const NOTE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function noteExpiryCutoff(now = Date.now()) {
  return new Date(now - NOTE_LIFETIME_MS).toISOString();
}

export function isNoteActive(createdAt: string, now = Date.now()) {
  return new Date(createdAt).getTime() > now - NOTE_LIFETIME_MS;
}