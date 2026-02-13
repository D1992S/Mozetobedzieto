import { describe, it, expect } from 'vitest';
import { createDatabaseConnection, runMigrations } from '../index.ts';
import { createCoreRepository } from './core-repository.ts';

describe('createCoreRepository', () => {
  const createTestDb = () => {
    const connectionResult = createDatabaseConnection();
    if (!connectionResult.ok) {
      throw new Error('Failed to create connection');
    }
    const migrationResult = runMigrations(connectionResult.value.db);
    if (!migrationResult.ok) {
      throw new Error('Failed to run migrations');
    }
    return connectionResult.value;
  };

  describe('upsertProfile', () => {
    it('inserts new profile', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const result = repo.upsertProfile({
        id: 'profile-001',
        name: 'Test Profile',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      connection.close();
    });

    it('updates existing profile', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      repo.upsertProfile({
        id: 'profile-002',
        name: 'Old Name',
        isActive: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = repo.upsertProfile({
        id: 'profile-002',
        name: 'New Name',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      connection.close();
    });
  });

  describe('createSyncRun', () => {
    it('creates new sync run and returns ID', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      repo.upsertProfile({
        id: 'profile-001',
        name: 'Test Profile',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = repo.createSyncRun({
        profileId: 'profile-001',
        status: 'running',
        stage: 'collect-provider-data',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value).toBe('number');
        expect(result.value).toBeGreaterThan(0);
      }
      connection.close();
    });

    it('creates sync run without profileId', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const result = repo.createSyncRun({
        status: 'running',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      connection.close();
    });
  });

  describe('getSyncRunById', () => {
    it('returns sync run when exists', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const createResult = repo.createSyncRun({
        status: 'running',
        stage: 'collect-provider-data',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) {
        connection.close();
        return;
      }

      const getResult = repo.getSyncRunById({ syncRunId: createResult.value });
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value).not.toBeNull();
        expect(getResult.value?.status).toBe('running');
      }
      connection.close();
    });

    it('returns null when sync run does not exist', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const result = repo.getSyncRunById({ syncRunId: 999999 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
      connection.close();
    });
  });

  describe('finishSyncRun', () => {
    it('marks sync run as completed', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const createResult = repo.createSyncRun({
        status: 'running',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) {
        connection.close();
        return;
      }

      const finishResult = repo.finishSyncRun({
        syncRunId: createResult.value,
        status: 'completed',
        stage: 'completed',
        finishedAt: '2026-01-01T10:05:00.000Z',
      });

      expect(finishResult.ok).toBe(true);
      connection.close();
    });

    it('records error details for failed sync run', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const createResult = repo.createSyncRun({
        status: 'running',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) {
        connection.close();
        return;
      }

      const finishResult = repo.finishSyncRun({
        syncRunId: createResult.value,
        status: 'failed',
        stage: 'collect-provider-data',
        finishedAt: '2026-01-01T10:02:00.000Z',
        errorCode: 'TEST_ERROR',
        errorMessage: 'Test error message',
      });

      expect(finishResult.ok).toBe(true);
      connection.close();
    });
  });

  describe('getChannelSnapshot', () => {
    it('returns null when channel does not exist', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const result = repo.getChannelSnapshot({ channelId: 'UC-NONEXISTENT' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
      connection.close();
    });

    it('returns snapshot after channel upsert', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      repo.upsertChannel({
        channelId: 'UC-TEST-001',
        name: 'Test Channel',
        description: 'Test',
        publishedAt: '2020-01-01T00:00:00.000Z',
        subscriberCount: 1000,
        videoCount: 50,
        viewCount: 50000,
      });

      const result = repo.getChannelSnapshot({ channelId: 'UC-TEST-001' });
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.channelId).toBe('UC-TEST-001');
        expect(result.value.subscriberCount).toBe(1000);
      }
      connection.close();
    });
  });

  describe('upsertVideos', () => {
    it('inserts multiple videos in transaction', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      repo.upsertChannel({
        channelId: 'UC-TEST',
        name: 'Test Channel',
        description: 'Test',
        publishedAt: '2020-01-01T00:00:00.000Z',
        subscriberCount: 1000,
        videoCount: 50,
        viewCount: 50000,
      });

      const result = repo.upsertVideos([
        {
          videoId: 'VID-001',
          channelId: 'UC-TEST',
          title: 'Video 1',
          description: 'Test',
          publishedAt: '2024-01-01T00:00:00.000Z',
          viewCount: 100,
          likeCount: 5,
          commentCount: 2,
        },
        {
          videoId: 'VID-002',
          channelId: 'UC-TEST',
          title: 'Video 2',
          description: 'Test',
          publishedAt: '2024-01-02T00:00:00.000Z',
          viewCount: 200,
          likeCount: 10,
          commentCount: 3,
        },
      ]);

      expect(result.ok).toBe(true);
      connection.close();
    });

    it('handles empty video array', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const result = repo.upsertVideos([]);
      expect(result.ok).toBe(true);
      connection.close();
    });
  });

  describe('upsertChannelDays', () => {
    it('inserts channel day metrics', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      repo.upsertChannel({
        channelId: 'UC-TEST',
        name: 'Test Channel',
        description: 'Test',
        publishedAt: '2020-01-01T00:00:00.000Z',
        subscriberCount: 1000,
        videoCount: 50,
        viewCount: 50000,
      });

      const result = repo.upsertChannelDays([
        {
          channelId: 'UC-TEST',
          date: '2026-01-01',
          subscribers: 1000,
          views: 500,
          videos: 10,
          likes: 25,
          comments: 5,
        },
      ]);

      expect(result.ok).toBe(true);
      connection.close();
    });

    it('accumulates views, likes, comments on conflict', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      repo.upsertChannel({
        channelId: 'UC-TEST',
        name: 'Test Channel',
        description: 'Test',
        publishedAt: '2020-01-01T00:00:00.000Z',
        subscriberCount: 1000,
        videoCount: 50,
        viewCount: 50000,
      });

      repo.upsertChannelDays([
        {
          channelId: 'UC-TEST',
          date: '2026-01-01',
          subscribers: 1000,
          views: 100,
          videos: 10,
          likes: 10,
          comments: 2,
        },
      ]);

      repo.upsertChannelDays([
        {
          channelId: 'UC-TEST',
          date: '2026-01-01',
          subscribers: 1005,
          views: 50,
          videos: 10,
          likes: 5,
          comments: 1,
        },
      ]);

      const row = connection.db
        .prepare<
          { channelId: string; date: string },
          { views: number; likes: number; comments: number }
        >(
          `
          SELECT views, likes, comments
          FROM fact_channel_day
          WHERE channel_id = @channelId AND date = @date
        `,
        )
        .get({ channelId: 'UC-TEST', date: '2026-01-01' });

      expect(row?.views).toBe(150);
      expect(row?.likes).toBe(15);
      expect(row?.comments).toBe(3);
      connection.close();
    });
  });

  describe('hasPersistedSyncBatch', () => {
    it('returns false when no raw responses exist', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const createResult = repo.createSyncRun({
        status: 'running',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) {
        connection.close();
        return;
      }

      const result = repo.hasPersistedSyncBatch({ syncRunId: createResult.value });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
      connection.close();
    });

    it('returns true when all three required endpoints are recorded', () => {
      const connection = createTestDb();
      const repo = createCoreRepository(connection.db);

      const createResult = repo.createSyncRun({
        status: 'running',
        startedAt: '2026-01-01T10:00:00.000Z',
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) {
        connection.close();
        return;
      }

      const syncRunId = createResult.value;
      repo.recordRawApiResponse({
        source: 'test',
        endpoint: 'getChannelStats',
        responseBodyJson: '{}',
        httpStatus: 200,
        fetchedAt: '2026-01-01T10:00:00.000Z',
        syncRunId,
      });
      repo.recordRawApiResponse({
        source: 'test',
        endpoint: 'getRecentVideos',
        responseBodyJson: '[]',
        httpStatus: 200,
        fetchedAt: '2026-01-01T10:00:00.000Z',
        syncRunId,
      });
      repo.recordRawApiResponse({
        source: 'test',
        endpoint: 'getVideoStats',
        responseBodyJson: '[]',
        httpStatus: 200,
        fetchedAt: '2026-01-01T10:00:00.000Z',
        syncRunId,
      });

      const result = repo.hasPersistedSyncBatch({ syncRunId });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
      connection.close();
    });
  });
});