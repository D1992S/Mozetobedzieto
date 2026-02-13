import { describe, it, expect } from 'vitest';
import { ok, err, AppError } from '@moze/shared';
import { createCachedDataProvider } from './cache-provider.ts';
import type { DataProvider } from './data-provider.ts';

describe('createCachedDataProvider', () => {
  it('caches successful responses within TTL', () => {
    let callCount = 0;
    let nowMs = 0;

    const baseProvider: DataProvider = {
      name: 'test-provider',
      getChannelStats: () => {
        callCount += 1;
        return ok({
          channelId: 'UC-001',
          name: 'Test',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          createdAt: '2020-01-01T00:00:00.000Z',
          lastSyncAt: null,
        });
      },
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const cached = createCachedDataProvider(baseProvider, {
      ttlMsByEndpoint: { getChannelStats: 5000 },
      now: () => nowMs,
    });

    const first = cached.getChannelStats({ channelId: 'UC-001' });
    expect(first.ok).toBe(true);
    expect(callCount).toBe(1);

    const second = cached.getChannelStats({ channelId: 'UC-001' });
    expect(second.ok).toBe(true);
    expect(callCount).toBe(1);
  });

  it('expires cache after TTL and refetches', () => {
    let callCount = 0;
    let nowMs = 0;

    const baseProvider: DataProvider = {
      name: 'test-provider',
      getChannelStats: () => {
        callCount += 1;
        return ok({
          channelId: 'UC-001',
          name: 'Test',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          createdAt: '2020-01-01T00:00:00.000Z',
          lastSyncAt: null,
        });
      },
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const cached = createCachedDataProvider(baseProvider, {
      ttlMsByEndpoint: { getChannelStats: 1000 },
      now: () => nowMs,
    });

    cached.getChannelStats({ channelId: 'UC-001' });
    expect(callCount).toBe(1);

    nowMs = 1500;
    cached.getChannelStats({ channelId: 'UC-001' });
    expect(callCount).toBe(2);
  });

  it('does not cache error responses', () => {
    let callCount = 0;

    const baseProvider: DataProvider = {
      name: 'test-provider',
      getChannelStats: () => {
        callCount += 1;
        return err(AppError.create('TEST_ERROR', 'Test error', 'error', {}));
      },
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const cached = createCachedDataProvider(baseProvider, {
      ttlMsByEndpoint: { getChannelStats: 5000 },
      now: () => 0,
    });

    const first = cached.getChannelStats({ channelId: 'UC-001' });
    expect(first.ok).toBe(false);
    expect(callCount).toBe(1);

    const second = cached.getChannelStats({ channelId: 'UC-001' });
    expect(second.ok).toBe(false);
    expect(callCount).toBe(2);
  });

  it('caches different queries separately', () => {
    let callCount = 0;

    const baseProvider: DataProvider = {
      name: 'test-provider',
      getChannelStats: ({ channelId }) => {
        callCount += 1;
        return ok({
          channelId,
          name: 'Test',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          createdAt: '2020-01-01T00:00:00.000Z',
          lastSyncAt: null,
        });
      },
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const cached = createCachedDataProvider(baseProvider, {
      ttlMsByEndpoint: { getChannelStats: 5000 },
      now: () => 0,
    });

    cached.getChannelStats({ channelId: 'UC-001' });
    cached.getChannelStats({ channelId: 'UC-002' });
    expect(callCount).toBe(2);

    cached.getChannelStats({ channelId: 'UC-001' });
    expect(callCount).toBe(2);
  });

  it('skips caching when TTL is zero or negative', () => {
    let callCount = 0;

    const baseProvider: DataProvider = {
      name: 'test-provider',
      getChannelStats: () => {
        callCount += 1;
        return ok({
          channelId: 'UC-001',
          name: 'Test',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          createdAt: '2020-01-01T00:00:00.000Z',
          lastSyncAt: null,
        });
      },
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const cached = createCachedDataProvider(baseProvider, {
      ttlMsByEndpoint: { getChannelStats: 0 },
      now: () => 0,
    });

    cached.getChannelStats({ channelId: 'UC-001' });
    cached.getChannelStats({ channelId: 'UC-001' });
    expect(callCount).toBe(2);
  });

  it('preserves provider metadata in wrapped provider', () => {
    const baseProvider: DataProvider = {
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

    const cached = createCachedDataProvider(baseProvider);
    expect(cached.name).toBe('original-provider:cached');
    expect(cached.configured).toBe(true);
    expect(cached.requiresAuth).toBe(true);
  });

  it('caches all three endpoint types independently', () => {
    let channelCalls = 0;
    let videoCalls = 0;
    let recentCalls = 0;

    const baseProvider: DataProvider = {
      name: 'test-provider',
      getChannelStats: () => {
        channelCalls += 1;
        return ok({
          channelId: 'UC-001',
          name: 'Test',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          createdAt: '2020-01-01T00:00:00.000Z',
          lastSyncAt: null,
        });
      },
      getVideoStats: () => {
        videoCalls += 1;
        return ok([]);
      },
      getRecentVideos: () => {
        recentCalls += 1;
        return ok([]);
      },
    };

    const cached = createCachedDataProvider(baseProvider, {
      ttlMsByEndpoint: {
        getChannelStats: 1000,
        getVideoStats: 2000,
        getRecentVideos: 3000,
      },
      now: () => 0,
    });

    cached.getChannelStats({ channelId: 'UC-001' });
    cached.getChannelStats({ channelId: 'UC-001' });
    expect(channelCalls).toBe(1);

    cached.getVideoStats({ videoIds: ['VID-001'] });
    cached.getVideoStats({ videoIds: ['VID-001'] });
    expect(videoCalls).toBe(1);

    cached.getRecentVideos({ channelId: 'UC-001', limit: 5 });
    cached.getRecentVideos({ channelId: 'UC-001', limit: 5 });
    expect(recentCalls).toBe(1);
  });
});