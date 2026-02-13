import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { ok } from '@moze/shared';
import { createRecordingDataProvider } from './record-provider.ts';
import type { DataProvider } from './data-provider.ts';

describe('createRecordingDataProvider', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    tempFiles.length = 0;
  });

  const createMockProvider = (): DataProvider => ({
    name: 'test-provider',
    getChannelStats: () =>
      ok({
        channelId: 'UC-REC-001',
        name: 'Record Test',
        description: 'Test recording',
        thumbnailUrl: null,
        subscriberCount: 150,
        videoCount: 15,
        viewCount: 1500,
        createdAt: '2023-01-01T00:00:00.000Z',
        lastSyncAt: null,
      }),
    getVideoStats: () =>
      ok([
        {
          videoId: 'VID-REC-001',
          channelId: 'UC-REC-001',
          title: 'Test Video',
          description: 'Test',
          thumbnailUrl: null,
          publishedAt: '2024-01-01T00:00:00.000Z',
          durationSeconds: 600,
          viewCount: 500,
          likeCount: 25,
          commentCount: 5,
        },
      ]),
    getRecentVideos: () =>
      ok([
        {
          videoId: 'VID-REC-002',
          channelId: 'UC-REC-001',
          title: 'Recent Video',
          description: 'Test',
          thumbnailUrl: null,
          publishedAt: '2024-02-01T00:00:00.000Z',
          durationSeconds: 300,
          viewCount: 250,
          likeCount: 15,
          commentCount: 3,
        },
      ]),
  });

  it('wraps provider and appends :recording to name', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const baseProvider = createMockProvider();
    const recording = createRecordingDataProvider({
      provider: baseProvider,
      outputFilePath: tmpPath,
    });

    expect(recording.name).toBe('test-provider:recording');
    expect(recording.configured).toBe(true);
  });

  it('records channel stats to file', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
      now: () => '2026-01-01T00:00:00.000Z',
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });

    expect(fs.existsSync(tmpPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    expect(content.channel.channelId).toBe('UC-REC-001');
  });

  it('accumulates video stats across multiple calls', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
      now: () => '2026-01-01T00:00:00.000Z',
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });

    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    expect(content.videos.length).toBeGreaterThan(0);
  });

  it('deduplicates videos by videoId', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
      now: () => '2026-01-01T00:00:00.000Z',
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });

    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    const videoIds = content.videos.map((v: any) => v.videoId);
    const uniqueIds = new Set(videoIds);
    expect(videoIds.length).toBe(uniqueIds.size);
  });

  it('sorts videos by publishedAt descending in recording', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
      now: () => '2026-01-01T00:00:00.000Z',
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });
    recording.getRecentVideos({ channelId: 'UC-REC-001', limit: 5 });

    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    if (content.videos.length >= 2) {
      expect(content.videos[0].publishedAt >= content.videos[1].publishedAt).toBe(true);
    }
  });

  it('returns null for last record path before any recording', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
    });

    expect(recording.getLastRecordPath()).toBeNull();
  });

  it('returns output path after successful recording', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });
    expect(recording.getLastRecordPath()).toBe(tmpPath);
  });

  it('includes generatedAt timestamp in recording', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const fixedTime = '2026-01-15T10:30:00.000Z';
    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: tmpPath,
      now: () => fixedTime,
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    recording.getVideoStats({ videoIds: ['VID-REC-001'] });

    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    expect(content.generatedAt).toBe(fixedTime);
  });

  it('preserves provider metadata', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const baseProvider: DataProvider = {
      name: 'auth-provider',
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

    const recording = createRecordingDataProvider({
      provider: baseProvider,
      outputFilePath: tmpPath,
    });

    expect(recording.configured).toBe(true);
    expect(recording.requiresAuth).toBe(true);
  });

  it('returns error when recording save fails', () => {
    const invalidPath = '/root/forbidden/path.json';

    const recording = createRecordingDataProvider({
      provider: createMockProvider(),
      outputFilePath: invalidPath,
    });

    recording.getChannelStats({ channelId: 'UC-REC-001' });
    const result = recording.getVideoStats({ videoIds: ['VID-REC-001'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SYNC_RECORD_SAVE_FAILED');
    }
  });

  it('does not save when no channel snapshot exists', () => {
    const tmpPath = path.join(os.tmpdir(), `record-test-${Date.now()}.json`);
    tempFiles.push(tmpPath);

    const emptyProvider: DataProvider = {
      name: 'empty-provider',
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

    const recording = createRecordingDataProvider({
      provider: emptyProvider,
      outputFilePath: tmpPath,
    });

    recording.getVideoStats({ videoIds: [] });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });
});