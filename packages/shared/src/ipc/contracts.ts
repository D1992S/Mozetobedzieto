import { z } from 'zod/v4';
import { AppErrorSchema, type AppErrorDTO } from '../errors/app-error.ts';

export interface IpcOk<T> {
  ok: true;
  value: T;
}

export interface IpcErr {
  ok: false;
  error: AppErrorDTO;
}

export type IpcResult<T> = IpcOk<T> | IpcErr;

export const IpcResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([
    z.object({ ok: z.literal(true), value: dataSchema }),
    z.object({ ok: z.literal(false), error: AppErrorSchema }),
  ]);

export const EmptyPayloadSchema = z.undefined();

export const AppStatusDTOSchema = z.object({
  version: z.string(),
  dbReady: z.boolean(),
  profileId: z.string().nullable(),
  syncRunning: z.boolean(),
  lastSyncAt: z.iso.datetime().nullable(),
});

export type AppStatusDTO = z.infer<typeof AppStatusDTOSchema>;
export const AppStatusResultSchema = IpcResultSchema(AppStatusDTOSchema);
export type AppStatusResult = z.infer<typeof AppStatusResultSchema>;

export const KpiQueryDTOSchema = z.object({
  channelId: z.string(),
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
});

export type KpiQueryDTO = z.infer<typeof KpiQueryDTOSchema>;

export const KpiResultDTOSchema = z.object({
  subscribers: z.number(),
  subscribersDelta: z.number(),
  views: z.number(),
  viewsDelta: z.number(),
  videos: z.number(),
  videosDelta: z.number(),
  avgViewsPerVideo: z.number(),
  engagementRate: z.number(),
});

export type KpiResultDTO = z.infer<typeof KpiResultDTOSchema>;
export const KpiResultSchema = IpcResultSchema(KpiResultDTOSchema);
export type KpiResult = z.infer<typeof KpiResultSchema>;

export const TimeseriesQueryDTOSchema = z.object({
  channelId: z.string(),
  metric: z.enum(['views', 'subscribers', 'likes', 'comments']),
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
});

export type TimeseriesQueryDTO = z.infer<typeof TimeseriesQueryDTOSchema>;

export const TimeseriesPointSchema = z.object({
  date: z.iso.date(),
  value: z.number(),
  predicted: z.number().nullable().optional(),
  confidenceLow: z.number().nullable().optional(),
  confidenceHigh: z.number().nullable().optional(),
});

export type TimeseriesPoint = z.infer<typeof TimeseriesPointSchema>;

export const TimeseriesResultDTOSchema = z.object({
  metric: z.string(),
  granularity: z.string(),
  points: z.array(TimeseriesPointSchema),
});

export type TimeseriesResultDTO = z.infer<typeof TimeseriesResultDTOSchema>;
export const TimeseriesResultSchema = IpcResultSchema(TimeseriesResultDTOSchema);
export type TimeseriesResult = z.infer<typeof TimeseriesResultSchema>;

export const ChannelIdDTOSchema = z.object({
  channelId: z.string(),
});

export type ChannelIdDTO = z.infer<typeof ChannelIdDTOSchema>;

export const ChannelInfoDTOSchema = z.object({
  channelId: z.string(),
  name: z.string(),
  description: z.string(),
  thumbnailUrl: z.url().nullable(),
  subscriberCount: z.number(),
  videoCount: z.number(),
  viewCount: z.number(),
  createdAt: z.iso.datetime(),
  lastSyncAt: z.iso.datetime().nullable(),
});

export type ChannelInfoDTO = z.infer<typeof ChannelInfoDTOSchema>;
export const ChannelInfoResultSchema = IpcResultSchema(ChannelInfoDTOSchema);
export type ChannelInfoResult = z.infer<typeof ChannelInfoResultSchema>;

export const IPC_CHANNELS = {
  APP_GET_STATUS: 'app:getStatus',
  DB_GET_KPIS: 'db:getKpis',
  DB_GET_TIMESERIES: 'db:getTimeseries',
  DB_GET_CHANNEL_INFO: 'db:getChannelInfo',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export const IPC_EVENTS = {
  SYNC_PROGRESS: 'sync:progress',
  SYNC_COMPLETE: 'sync:complete',
  SYNC_ERROR: 'sync:error',
} as const;

export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS];
