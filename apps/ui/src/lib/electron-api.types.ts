import type {
  AppStatusResult,
  ChannelIdDTO,
  ChannelInfoResult,
  KpiQueryDTO,
  KpiResult,
  SyncCompleteEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  TimeseriesQueryDTO,
  TimeseriesResult,
} from '@moze/shared';

export interface ElectronAPI {
  appGetStatus: () => Promise<AppStatusResult>;
  dbGetKpis: (query: KpiQueryDTO) => Promise<KpiResult>;
  dbGetTimeseries: (query: TimeseriesQueryDTO) => Promise<TimeseriesResult>;
  dbGetChannelInfo: (query: ChannelIdDTO) => Promise<ChannelInfoResult>;
  onSyncProgress: (callback: (event: SyncProgressEvent) => void) => () => void;
  onSyncComplete: (callback: (event: SyncCompleteEvent) => void) => () => void;
  onSyncError: (callback: (event: SyncErrorEvent) => void) => () => void;
}
