import { describe, it, expect } from 'vitest';
import { ok, AppError } from '@moze/shared';
import { createRateLimitedDataProvider } from './rate-limiter.ts';
import type { DataProvider } from './data-provider.ts';

describe('createRateLimitedDataProvider', () => {
  const createMockProvider = (): DataProvider => ({
    name: 'test-provider',
    getChannelStats: () =>
      ok({
        channelId: 'UC-001',
        name: 'Test',
        description: 'Test',
        thumbnailUrl: null,
        subscriberCount: 100,
        videoCount: 10,
        viewCount: 1000,
        createdAt: '2020-01-01T00:00:00.000Z',
        lastSyncAt: null,
      }),
    getVideoStats: () => ok([]),
    getRecentVideos: () => ok([]),
  });

  it('allows requests within token bucket capacity', () => {
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: { getChannelStats: { capacity: 2, tokensPerSecond: 0 } },
      now: () => 0,
    });

    const first = limited.getChannelStats({ channelId: 'UC-001' });
    expect(first.ok).toBe(true);

    const second = limited.getChannelStats({ channelId: 'UC-001' });
    expect(second.ok).toBe(true);
  });

  it('blocks requests exceeding token bucket capacity', () => {
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: { getChannelStats: { capacity: 1, tokensPerSecond: 0 } },
      now: () => 0,
    });

    const first = limited.getChannelStats({ channelId: 'UC-001' });
    expect(first.ok).toBe(true);

    const second = limited.getChannelStats({ channelId: 'UC-001' });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('SYNC_RATE_LIMIT_EXCEEDED');
    }
  });

  it('refills tokens over time', () => {
    let nowMs = 0;
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: { getChannelStats: { capacity: 1, tokensPerSecond: 1 } },
      now: () => nowMs,
    });

    const first = limited.getChannelStats({ channelId: 'UC-001' });
    expect(first.ok).toBe(true);

    const second = limited.getChannelStats({ channelId: 'UC-001' });
    expect(second.ok).toBe(false);

    nowMs = 1500;
    const third = limited.getChannelStats({ channelId: 'UC-001' });
    expect(third.ok).toBe(true);
  });

  it('caps refilled tokens at capacity', () => {
    let nowMs = 0;
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: { getChannelStats: { capacity: 2, tokensPerSecond: 10 } },
      now: () => nowMs,
    });

    nowMs = 10_000;
    const first = limited.getChannelStats({ channelId: 'UC-001' });
    expect(first.ok).toBe(true);

    const second = limited.getChannelStats({ channelId: 'UC-001' });
    expect(second.ok).toBe(true);

    const third = limited.getChannelStats({ channelId: 'UC-001' });
    expect(third.ok).toBe(false);
  });

  it('applies independent limits to different endpoints', () => {
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: {
        getChannelStats: { capacity: 1, tokensPerSecond: 0 },
        getVideoStats: { capacity: 2, tokensPerSecond: 0 },
      },
      now: () => 0,
    });

    const channel1 = limited.getChannelStats({ channelId: 'UC-001' });
    expect(channel1.ok).toBe(true);

    const channel2 = limited.getChannelStats({ channelId: 'UC-001' });
    expect(channel2.ok).toBe(false);

    const video1 = limited.getVideoStats({ videoIds: ['VID-001'] });
    expect(video1.ok).toBe(true);

    const video2 = limited.getVideoStats({ videoIds: ['VID-002'] });
    expect(video2.ok).toBe(true);
  });

  it('uses default limits when not specified', () => {
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, { now: () => 0 });

    let successCount = 0;
    for (let i = 0; i < 25; i++) {
      const result = limited.getChannelStats({ channelId: `UC-${String(i).padStart(3, '0')}` });
      if (result.ok) {
        successCount += 1;
      }
    }

    expect(successCount).toBe(20);
  });

  it('preserves provider metadata', () => {
    const provider: DataProvider = {
      name: 'original-provider',
      configured: true,
      requiresAuth: true,
      getChannelStats: () =>
        ok({
          channelId: 'UC-001',
          name: 'Test',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          createdAt: '2020-01-01T00:00:00.000Z',
          lastSyncAt: null,
        }),
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const limited = createRateLimitedDataProvider(provider);
    expect(limited.name).toBe('original-provider:rate-limited');
    expect(limited.configured).toBe(true);
    expect(limited.requiresAuth).toBe(true);
  });

  it('includes endpoint and query context in rate limit error', () => {
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: { getChannelStats: { capacity: 1, tokensPerSecond: 0 } },
      now: () => 0,
    });

    limited.getChannelStats({ channelId: 'UC-001' });
    const result = limited.getChannelStats({ channelId: 'UC-002' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.context.endpoint).toBe('getChannelStats');
      expect(result.error.context.query).toBeDefined();
    }
  });

  it('handles fractional token refill correctly', () => {
    let nowMs = 0;
    const provider = createMockProvider();
    const limited = createRateLimitedDataProvider(provider, {
      limits: { getChannelStats: { capacity: 10, tokensPerSecond: 2 } },
      now: () => nowMs,
    });

    for (let i = 0; i < 10; i++) {
      const result = limited.getChannelStats({ channelId: `UC-00${String(i)}` });
      expect(result.ok).toBe(true);
    }

    nowMs = 250;
    const partial = limited.getChannelStats({ channelId: 'UC-PARTIAL' });
    expect(partial.ok).toBe(false);

    nowMs = 500;
    const afterRefill = limited.getChannelStats({ channelId: 'UC-AFTER' });
    expect(afterRefill.ok).toBe(true);
  });
});