import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createFakeDataProvider } from './fake-provider.ts';

const fixturePath = fileURLToPath(new URL('../../../fixtures/seed-data.json', import.meta.url));

describe('createFakeDataProvider', () => {
  it('creates provider from valid fixture file', () => {
    const result = createFakeDataProvider({ fixturePath });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('fake-data-provider');
      expect(result.value.configured).toBe(true);
      expect(result.value.requiresAuth).toBe(false);
    }
  });

  it('fails to create provider from non-existent file', () => {
    const result = createFakeDataProvider({ fixturePath: '/non/existent/path.json' });
    expect(result.ok).toBe(false);
  });

  it('returns channel stats for matching channelId', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getChannelStats({ channelId: 'UC-SEED-PL-001' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.channelId).toBe('UC-SEED-PL-001');
      expect(result.value.name).toBeTruthy();
    }
  });

  it('fails for non-matching channelId', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getChannelStats({ channelId: 'UC-NONEXISTENT' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SYNC_FAKE_DATA_NOT_FOUND');
    }
  });

  it('returns video stats for existing video IDs', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getVideoStats({
      videoIds: ['VID-001', 'VID-002'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0]?.videoId).toBeTruthy();
    }
  });

  it('filters out non-existent video IDs', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getVideoStats({
      videoIds: ['VID-001', 'VID-NONEXISTENT', 'VID-002'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2);
    }
  });

  it('fails when no video IDs match', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getVideoStats({
      videoIds: ['VID-NONEXISTENT1', 'VID-NONEXISTENT2'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SYNC_FAKE_DATA_NOT_FOUND');
    }
  });

  it('returns recent videos sorted by publishedAt descending', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getRecentVideos({
      channelId: 'UC-SEED-PL-001',
      limit: 3,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeLessThanOrEqual(3);
      if (result.value.length >= 2) {
        expect(result.value[0]!.publishedAt >= result.value[1]!.publishedAt).toBe(true);
      }
    }
  });

  it('respects limit parameter for recent videos', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getRecentVideos({
      channelId: 'UC-SEED-PL-001',
      limit: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeLessThanOrEqual(2);
    }
  });

  it('fails for non-matching channelId in recent videos', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getRecentVideos({
      channelId: 'UC-NONEXISTENT',
      limit: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SYNC_FAKE_DATA_NOT_FOUND');
    }
  });

  it('returns videos for duplicate IDs without deduplication', () => {
    const providerResult = createFakeDataProvider({ fixturePath });
    expect(providerResult.ok).toBe(true);
    if (!providerResult.ok) {
      return;
    }

    const result = providerResult.value.getVideoStats({
      videoIds: ['VID-001', 'VID-001', 'VID-002', 'VID-002'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
    }
  });
});