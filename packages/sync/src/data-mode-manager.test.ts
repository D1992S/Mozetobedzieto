import { describe, it, expect } from 'vitest';
import { ok, err, AppError } from '@moze/shared';
import { createDataModeManager } from './data-mode-manager.ts';
import type { DataProvider } from './data-provider.ts';

describe('createDataModeManager', () => {
  const createMockProvider = (name: string, configured = true): DataProvider => ({
    name,
    configured,
    requiresAuth: false,
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

  const createRecordProvider = (name: string, configured = true) => ({
    ...createMockProvider(name, configured),
    getLastRecordPath: () => null,
  });

  it('initializes with default fake mode', () => {
    const manager = createDataModeManager({
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const status = manager.getStatus();
    expect(status.mode).toBe('fake');
  });

  it('accepts custom initial mode', () => {
    const manager = createDataModeManager({
      initialMode: 'real',
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const status = manager.getStatus();
    expect(status.mode).toBe('real');
  });

  it('switches modes successfully', () => {
    const manager = createDataModeManager({
      initialMode: 'fake',
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const result = manager.setMode({ mode: 'real' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mode).toBe('real');
    }
  });

  it('rejects invalid mode', () => {
    const manager = createDataModeManager({
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const result = manager.setMode({ mode: 'invalid' as any });
    expect(result.ok).toBe(false);
  });

  it('hides unconfigured providers from available modes', () => {
    const manager = createDataModeManager({
      initialMode: 'fake',
      fakeProvider: createMockProvider('fake', true),
      realProvider: createMockProvider('real', false),
      recordProvider: createRecordProvider('record', true),
    });

    const status = manager.getStatus();
    expect(status.availableModes).toContain('fake');
    expect(status.availableModes).toContain('record');
    expect(status.availableModes).not.toContain('real');
  });

  it('blocks mode activation when canActivateMode guard fails', () => {
    const manager = createDataModeManager({
      initialMode: 'fake',
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
      canActivateMode: ({ mode }) => {
        if (mode === 'real') {
          return err(AppError.create('TEST_BLOCK', 'Blocked', 'error', {}));
        }
        return ok(undefined);
      },
    });

    const result = manager.setMode({ mode: 'real' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TEST_BLOCK');
    }
  });

  it('fallbacks to first available mode when initial mode unavailable', () => {
    const manager = createDataModeManager({
      initialMode: 'real',
      fakeProvider: createMockProvider('fake', true),
      realProvider: createMockProvider('real', false),
      recordProvider: createRecordProvider('record', true),
    });

    const status = manager.getStatus();
    expect(status.mode).toBe('fake');
  });

  it('returns active provider matching current mode', () => {
    const fakeProvider = createMockProvider('fake-provider');
    const manager = createDataModeManager({
      initialMode: 'fake',
      fakeProvider,
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const active = manager.getActiveProvider();
    expect(active.mode).toBe('fake');
    expect(active.provider.name).toBe('fake-provider');
  });

  it('probes current mode and returns data', () => {
    const manager = createDataModeManager({
      initialMode: 'fake',
      fakeProvider: createMockProvider('fake-provider'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const result = manager.probe({
      channelId: 'UC-001',
      videoIds: ['VID-001', 'VID-002'],
      recentLimit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mode).toBe('fake');
      expect(result.value.providerName).toBe('fake-provider');
      expect(result.value.channelId).toBe('UC-001');
    }
  });

  it('validates probe input and rejects invalid data', () => {
    const manager = createDataModeManager({
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const result = manager.probe({
      channelId: '',
      videoIds: [],
      recentLimit: -5,
    } as any);

    expect(result.ok).toBe(false);
  });

  it('includes source in status when provided', () => {
    const manager = createDataModeManager({
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
      source: 'test-runtime',
    });

    const status = manager.getStatus();
    expect(status.source).toBe('test-runtime');
  });

  it('defaults source to desktop-runtime when not provided', () => {
    const manager = createDataModeManager({
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider: createRecordProvider('record'),
    });

    const status = manager.getStatus();
    expect(status.source).toBe('desktop-runtime');
  });

  it('returns record file path in probe when in record mode', () => {
    const recordProvider = {
      ...createMockProvider('record-provider'),
      getLastRecordPath: () => '/path/to/recording.json',
    };

    const manager = createDataModeManager({
      initialMode: 'record',
      fakeProvider: createMockProvider('fake'),
      realProvider: createMockProvider('real'),
      recordProvider,
    });

    const result = manager.probe({
      channelId: 'UC-001',
      videoIds: ['VID-001'],
      recentLimit: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recordFilePath).toBe('/path/to/recording.json');
    }
  });
});