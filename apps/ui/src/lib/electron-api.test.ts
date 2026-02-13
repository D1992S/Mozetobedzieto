import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ElectronAPI } from './electron-api.types.ts';

describe('electron-api helper functions', () => {
  let originalWindowElectronAPI: any;

  beforeEach(() => {
    originalWindowElectronAPI = (globalThis as any).window?.electronAPI;
  });

  afterEach(() => {
    if (originalWindowElectronAPI !== undefined) {
      if (!(globalThis as any).window) {
        (globalThis as any).window = {};
      }
      (globalThis as any).window.electronAPI = originalWindowElectronAPI;
    } else {
      if ((globalThis as any).window) {
        delete (globalThis as any).window.electronAPI;
      }
    }
  });

  describe('ensureElectronApi', () => {
    it('throws when electronAPI is not available', async () => {
      (globalThis as any).window = {};

      const { fetchAppStatus } = await import('./electron-api.ts');

      await expect(fetchAppStatus()).rejects.toThrow('Brak mostu Electron');
    });

    it('returns electronAPI when available', async () => {
      const mockElectronAPI: Partial<ElectronAPI> = {
        appGetStatus: async () => ({
          ok: true,
          value: {
            version: '1.0.0',
            dbReady: true,
            profileId: 'test-profile',
            syncRunning: false,
            lastSyncAt: null,
          },
        }),
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchAppStatus } = await import('./electron-api.ts');
      const result = await fetchAppStatus();

      expect(result.version).toBe('1.0.0');
    });
  });

  describe('unwrapResult', () => {
    it('returns value for Ok result', async () => {
      const mockElectronAPI: Partial<ElectronAPI> = {
        appGetStatus: async () => ({
          ok: true,
          value: {
            version: '1.0.0',
            dbReady: true,
            profileId: 'test-profile',
            syncRunning: false,
            lastSyncAt: null,
          },
        }),
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchAppStatus } = await import('./electron-api.ts');
      const result = await fetchAppStatus();

      expect(result.version).toBe('1.0.0');
      expect(result.dbReady).toBe(true);
    });

    it('throws IpcInvokeError for Err result', async () => {
      const mockElectronAPI: Partial<ElectronAPI> = {
        appGetStatus: async () => ({
          ok: false,
          error: {
            code: 'TEST_ERROR',
            message: 'Test error message',
            severity: 'error' as const,
            context: { detail: 'test' },
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        }),
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchAppStatus } = await import('./electron-api.ts');

      await expect(fetchAppStatus()).rejects.toThrow('[TEST_ERROR] Test error message');
    });

    it('includes error code and context in thrown error', async () => {
      const mockElectronAPI: Partial<ElectronAPI> = {
        appGetStatus: async () => ({
          ok: false,
          error: {
            code: 'APP_DB_NOT_READY',
            message: 'Database not ready',
            severity: 'error' as const,
            context: { dbPath: '/path/to/db' },
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        }),
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchAppStatus } = await import('./electron-api.ts');

      try {
        await fetchAppStatus();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('APP_DB_NOT_READY');
        expect(error.context).toEqual({ dbPath: '/path/to/db' });
        expect(error.name).toBe('IpcInvokeError');
      }
    });
  });

  describe('API function wrappers', () => {
    it('fetchDataModeStatus calls appGetDataMode', async () => {
      let called = false;
      const mockElectronAPI: Partial<ElectronAPI> = {
        appGetDataMode: async () => {
          called = true;
          return {
            ok: true,
            value: {
              mode: 'fake' as const,
              availableModes: ['fake' as const],
              source: 'test',
            },
          };
        },
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchDataModeStatus } = await import('./electron-api.ts');
      await fetchDataModeStatus();

      expect(called).toBe(true);
    });

    it('setDataMode passes input to appSetDataMode', async () => {
      let receivedInput: any = null;
      const mockElectronAPI: Partial<ElectronAPI> = {
        appSetDataMode: async (input: any) => {
          receivedInput = input;
          return {
            ok: true,
            value: {
              mode: input.mode,
              availableModes: [input.mode],
              source: 'test',
            },
          };
        },
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { setDataMode } = await import('./electron-api.ts');
      await setDataMode({ mode: 'real' });

      expect(receivedInput).toEqual({ mode: 'real' });
    });

    it('startSync passes input to syncStart', async () => {
      let receivedInput: any = null;
      const mockElectronAPI: Partial<ElectronAPI> = {
        syncStart: async (input: any) => {
          receivedInput = input;
          return {
            ok: true,
            value: {
              syncRunId: 1,
              status: 'running' as const,
              stage: 'collect-provider-data',
              recordsProcessed: 0,
              pipelineFeatures: null,
            },
          };
        },
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { startSync } = await import('./electron-api.ts');
      await startSync({ channelId: 'UC-001', recentLimit: 10 });

      expect(receivedInput.channelId).toBe('UC-001');
      expect(receivedInput.recentLimit).toBe(10);
    });
  });

  describe('Query function wrappers', () => {
    it('fetchKpis calls dbGetKpis with query', async () => {
      let receivedQuery: any = null;
      const mockElectronAPI: Partial<ElectronAPI> = {
        dbGetKpis: async (query: any) => {
          receivedQuery = query;
          return {
            ok: true,
            value: {
              views: 1000,
              viewsDelta: 100,
              subscribers: 500,
              subscribersDelta: 50,
              videos: 10,
              videosDelta: 1,
              avgViewsPerVideo: 100,
              engagementRate: 0.05,
            },
          };
        },
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchKpis } = await import('./electron-api.ts');
      await fetchKpis({
        channelId: 'UC-TEST',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(receivedQuery.channelId).toBe('UC-TEST');
      expect(receivedQuery.dateFrom).toBe('2026-01-01');
      expect(receivedQuery.dateTo).toBe('2026-01-31');
    });

    it('fetchTimeseries calls dbGetTimeseries with query', async () => {
      let receivedQuery: any = null;
      const mockElectronAPI: Partial<ElectronAPI> = {
        dbGetTimeseries: async (query: any) => {
          receivedQuery = query;
          return {
            ok: true,
            value: {
              points: [],
            },
          };
        },
      };

      (globalThis as any).window = { electronAPI: mockElectronAPI };

      const { fetchTimeseries } = await import('./electron-api.ts');
      await fetchTimeseries({
        channelId: 'UC-TEST',
        metric: 'views' as const,
        granularity: 'day' as const,
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(receivedQuery.metric).toBe('views');
      expect(receivedQuery.granularity).toBe('day');
    });
  });
});