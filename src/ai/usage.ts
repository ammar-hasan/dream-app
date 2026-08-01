/**
 * Free-tier counter for the built-in Dream AI: a small daily allowance,
 * persisted in localStorage with date rollover. When the user brings their
 * own provider (BYOK) the panel hides the counter and usage is unlimited —
 * see registry.isBYOKActive().
 */

const USAGE_KEY = 'dream:ai-usage';
export const FREE_TRIES_PER_DAY = 20;

interface UsageRecord {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  count: number;
}

function today(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Today's usage; a stale record (another day) reads as zero. */
export function getUsageToday(): UsageRecord {
  const date = today();
  try {
    const raw = storage()?.getItem(USAGE_KEY);
    if (raw) {
      const record = JSON.parse(raw) as UsageRecord;
      if (record.date === date && typeof record.count === 'number') return record;
    }
  } catch {
    // corrupted or unavailable storage — treat as a fresh day
  }
  return { date, count: 0 };
}

export function freeTriesLeft(): number {
  return Math.max(0, FREE_TRIES_PER_DAY - getUsageToday().count);
}

/**
 * Spend one free try. Returns false when today's allowance is gone (nothing
 * is written then). Callers only run this for the built-in provider.
 */
export function consumeFreeTry(): boolean {
  const usage = getUsageToday();
  if (usage.count >= FREE_TRIES_PER_DAY) return false;
  try {
    storage()?.setItem(USAGE_KEY, JSON.stringify({ date: usage.date, count: usage.count + 1 }));
  } catch {
    // storage unavailable — allow the action rather than blocking creativity
  }
  return true;
}
