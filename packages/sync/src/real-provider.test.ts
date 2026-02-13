import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { ok, err, AppError } from '@moze/shared';
import { createRealDataProvider } from './real-provider.ts';

const fixturePath = fileURLToPath(new URL('../../../fixtures/seed-data.json', import.meta.url));

describe('createRealDataProvider', () => {
  it('creates unconfigured provider when no inputs provided', () => {
    const result = createRealDataProvider();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('real-provider-unconfigured');
      expect(result.value.configured).toBe(false);
      expect(result.value.requiresAuth).toBe(true);
    }
  });

  it('returns error for all methods when unconfigured', () => {
    const providerResult = createRealDataProvider();
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const channelResult = providerResult.value.getChannelStats({ channelId: 'UC-001' });
    expect(channelResult.ok).toBe(false);
    if (!channelResult.ok) {
      expect(channelResult.error.code).toBe('SYNC_REAL_PROVIDER_NOT_CONFIGURED');
    }

    const videoResult = providerResult.value.getVideoStats({ videoIds: ['VID-001'] });
    expect(videoResult.ok).toBe(false);

    const recentResult = providerResult.value.getRecentVideos({ channelId: 'UC-001', limit: 5 });
    expect(recentResult.ok).toBe(false);
  });

  it('creates fixture-based provider when fixturePath provided', () => {
    const result = createRealDataProvider({ fixturePath });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.configured).toBe(true);
      expect(result.value.requiresAuth).toBe(false);
    }
  });

  it('uses custom provider name when provided', () => {
    const result = createRealDataProvider({
      fixturePath,
      providerName: 'custom-real-provider',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('custom-real-provider');
    }
  });

  it('overrides requiresAuth when explicitly set', () => {
    const result = createRealDataProvider({
      fixturePath,
      requiresAuth: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requiresAuth).toBe(true);
    }
  });

  it('creates adapter-based provider when adapter provided', () => {
    const adapter = {
      getChannelStats: () =>
        ok({
          channelId: 'UC-ADAPTER',
          name: 'Adapter Channel',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 200,
          videoCount: 20,
          viewCount: 2000,
          createdAt: '2021-01-01T00:00:00.000Z',
          lastSyncAt: null,
        }),
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const result = createRealDataProvider({ adapter });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.configured).toBe(true);
      expect(result.value.requiresAuth).toBe(true);
    }
  });

  it('uses adapter methods when adapter provided', () => {
    let adapterCalled = false;
    const adapter = {
      getChannelStats: () => {
        adapterCalled = true;
        return ok({
          channelId: 'UC-ADAPTER',
          name: 'Adapter Channel',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 200,
          videoCount: 20,
          viewCount: 2000,
          createdAt: '2021-01-01T00:00:00.000Z',
          lastSyncAt: null,
        });
      },
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const providerResult = createRealDataProvider({ adapter });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getChannelStats({ channelId: 'UC-ADAPTER' });
    expect(result.ok).toBe(true);
    expect(adapterCalled).toBe(true);
  });

  it('prefers adapter over fixturePath when both provided', () => {
    const adapter = {
      getChannelStats: () =>
        ok({
          channelId: 'UC-FROM-ADAPTER',
          name: 'From Adapter',
          description: 'Test',
          thumbnailUrl: null,
          subscriberCount: 300,
          videoCount: 30,
          viewCount: 3000,
          createdAt: '2022-01-01T00:00:00.000Z',
          lastSyncAt: null,
        }),
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const providerResult = createRealDataProvider({ adapter, fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getChannelStats({ channelId: 'UC-FROM-ADAPTER' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.channelId).toBe('UC-FROM-ADAPTER');
    }
  });

  it('forwards errors from adapter', () => {
    const adapter = {
      getChannelStats: () => err(AppError.create('TEST_ERROR', 'Test error', 'error', {})),
      getVideoStats: () => ok([]),
      getRecentVideos: () => ok([]),
    };

    const providerResult = createRealDataProvider({ adapter });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getChannelStats({ channelId: 'UC-001' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TEST_ERROR');
    }
  });

  it('defaults to real-adapter-provider name when adapter provided without name', () => {
    const adapter = {
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

    const result = createRealDataProvider({ adapter });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('real-adapter-provider');
    }
  });

  it('defaults to real-fixture-provider name when fixture provided without name', () => {
    const result = createRealDataProvider({ fixturePath });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('real-fixture-provider');
    }
  });
});