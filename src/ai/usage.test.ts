/** Free-tier daily counter: limits, persistence and date rollover. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeFreeTry, FREE_TRIES_PER_DAY, freeTriesLeft, getUsageToday } from './usage';

describe('AI usage counter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('starts with the full daily allowance', () => {
    expect(freeTriesLeft()).toBe(FREE_TRIES_PER_DAY);
    expect(getUsageToday().count).toBe(0);
  });

  it('counts down as tries are consumed', () => {
    expect(consumeFreeTry()).toBe(true);
    expect(consumeFreeTry()).toBe(true);
    expect(freeTriesLeft()).toBe(FREE_TRIES_PER_DAY - 2);
  });

  it('refuses once the allowance is gone', () => {
    for (let i = 0; i < FREE_TRIES_PER_DAY; i += 1) expect(consumeFreeTry()).toBe(true);
    expect(consumeFreeTry()).toBe(false);
    expect(freeTriesLeft()).toBe(0);
    // A refused try does not inflate the count.
    expect(getUsageToday().count).toBe(FREE_TRIES_PER_DAY);
  });

  it('persists across reloads (same day)', () => {
    consumeFreeTry();
    consumeFreeTry();
    const record = JSON.parse(localStorage.getItem('dream:ai-usage') ?? '{}') as {
      date: string;
      count: number;
    };
    expect(record.count).toBe(2);
    expect(record.date).toBe(getUsageToday().date);
  });

  it('rolls over to a fresh allowance on a new day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T10:00:00'));
    for (let i = 0; i < FREE_TRIES_PER_DAY; i += 1) consumeFreeTry();
    expect(freeTriesLeft()).toBe(0);

    vi.setSystemTime(new Date('2026-08-02T08:00:00'));
    expect(freeTriesLeft()).toBe(FREE_TRIES_PER_DAY);
    expect(consumeFreeTry()).toBe(true);
  });

  it('treats a corrupted record as a fresh day', () => {
    localStorage.setItem('dream:ai-usage', '{not json');
    expect(freeTriesLeft()).toBe(FREE_TRIES_PER_DAY);
  });
});
