import {
  AppError,
  AppStatusDTOSchema,
  AppStatusResultSchema,
  ChannelIdDTOSchema,
  ChannelInfoDTOSchema,
  ChannelInfoResultSchema,
  EmptyPayloadSchema,
  IPC_CHANNELS,
  KpiQueryDTOSchema,
  KpiResultDTOSchema,
  KpiResultSchema,
  TimeseriesQueryDTOSchema,
  TimeseriesResultDTOSchema,
  TimeseriesResultSchema,
  type AppStatusDTO,
  type AppStatusResult,
  type ChannelInfoDTO,
  type ChannelInfoResult,
  type IpcResult,
  type KpiQueryDTO,
  type KpiResult,
  type KpiResultDTO,
  type Result,
  type TimeseriesQueryDTO,
  type TimeseriesResult,
  type TimeseriesResultDTO,
} from '@moze/shared';
import type { z } from 'zod/v4';

export interface DesktopIpcBackend {
  getAppStatus: () => Result<AppStatusDTO, AppError>;
  getKpis: (query: KpiQueryDTO) => Result<KpiResultDTO, AppError>;
  getTimeseries: (query: TimeseriesQueryDTO) => Result<TimeseriesResultDTO, AppError>;
  getChannelInfo: (query: { channelId: string }) => Result<ChannelInfoDTO, AppError>;
}

export interface IpcMainLike {
  handle: (
    channel: string,
    listener: (_event: unknown, payload: unknown) => unknown,
  ) => void;
}

function createValidationError(input: unknown, issues: unknown): AppError {
  return AppError.create(
    'IPC_INVALID_PAYLOAD',
    'Przekazano niepoprawne dane wejściowe IPC.',
    'error',
    { input, issues },
  );
}

function createOutputError(payload: unknown, issues: unknown): AppError {
  return AppError.create(
    'IPC_INVALID_OUTPUT',
    'Wewnętrzna odpowiedź IPC ma niepoprawny format.',
    'error',
    { payload, issues },
  );
}

function serializeError<T>(resultSchema: z.ZodType<IpcResult<T>>, error: AppError): IpcResult<T> {
  const parsed = resultSchema.safeParse({
    ok: false,
    error: error.toDTO(),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return {
    ok: false,
    error: AppError.create(
      'IPC_SERIALIZATION_FAILED',
      'Nie udało się zserializować błędu IPC.',
      'error',
        { issues: parsed.error.issues },
    ).toDTO(),
  };
}

function serializeSuccess<T>(
  outputSchema: z.ZodType<T>,
  resultSchema: z.ZodType<IpcResult<T>>,
  payload: unknown,
): IpcResult<T> {
  const validatedOutput = outputSchema.safeParse(payload);
  if (!validatedOutput.success) {
    return serializeError(resultSchema, createOutputError(payload, validatedOutput.error.issues));
  }

  const validatedResult = resultSchema.safeParse({
    ok: true,
    value: validatedOutput.data,
  });

  if (!validatedResult.success) {
    return serializeError(resultSchema, createOutputError(payload, validatedResult.error.issues));
  }

  return validatedResult.data;
}

function runHandler<TInput, TOutput>(
  payload: unknown,
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
  resultSchema: z.ZodType<IpcResult<TOutput>>,
  execute: (input: TInput) => Result<TOutput, AppError>,
): IpcResult<TOutput> {
  const inputValidation = inputSchema.safeParse(payload);
  if (!inputValidation.success) {
    return serializeError(resultSchema, createValidationError(payload, inputValidation.error.issues));
  }

  const result = execute(inputValidation.data);
  if (!result.ok) {
    return serializeError(resultSchema, result.error);
  }

  return serializeSuccess(outputSchema, resultSchema, result.value);
}

export function handleAppGetStatus(backend: DesktopIpcBackend, payload: unknown): AppStatusResult {
  return runHandler(
    payload,
    EmptyPayloadSchema,
    AppStatusDTOSchema,
    AppStatusResultSchema,
    () => backend.getAppStatus(),
  );
}

export function handleDbGetKpis(backend: DesktopIpcBackend, payload: unknown): KpiResult {
  return runHandler(
    payload,
    KpiQueryDTOSchema,
    KpiResultDTOSchema,
    KpiResultSchema,
    (query) => backend.getKpis(query),
  );
}

export function handleDbGetTimeseries(backend: DesktopIpcBackend, payload: unknown): TimeseriesResult {
  return runHandler(
    payload,
    TimeseriesQueryDTOSchema,
    TimeseriesResultDTOSchema,
    TimeseriesResultSchema,
    (query) => backend.getTimeseries(query),
  );
}

export function handleDbGetChannelInfo(backend: DesktopIpcBackend, payload: unknown): ChannelInfoResult {
  return runHandler(
    payload,
    ChannelIdDTOSchema,
    ChannelInfoDTOSchema,
    ChannelInfoResultSchema,
    (query) => backend.getChannelInfo(query),
  );
}

export function registerIpcHandlers(ipcMain: IpcMainLike, backend: DesktopIpcBackend): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_STATUS, (_event, payload) => handleAppGetStatus(backend, payload));
  ipcMain.handle(IPC_CHANNELS.DB_GET_KPIS, (_event, payload) => handleDbGetKpis(backend, payload));
  ipcMain.handle(IPC_CHANNELS.DB_GET_TIMESERIES, (_event, payload) => handleDbGetTimeseries(backend, payload));
  ipcMain.handle(IPC_CHANNELS.DB_GET_CHANNEL_INFO, (_event, payload) => handleDbGetChannelInfo(backend, payload));
}
