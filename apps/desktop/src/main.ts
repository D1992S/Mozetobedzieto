import { createChannelQueries, createDatabaseConnection, createMetricsQueries, runMigrations, type ChannelQueries, type DatabaseConnection, type MetricsQueries } from '@moze/core';
import { AppError, createLogger, err, ok, type AppStatusDTO, type KpiQueryDTO, type KpiResultDTO, type Result, type TimeseriesQueryDTO, type TimeseriesResultDTO } from '@moze/shared';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers, type DesktopIpcBackend } from './ipc-handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger({ baseContext: { module: 'desktop-main' } });

const IS_DEV = process.env.NODE_ENV !== 'production';
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';
const UI_ENTRY_PATH = path.join(__dirname, '../../ui/dist/index.html');
const DB_FILENAME = 'mozetobedzieto.sqlite';

interface BackendState {
  connection: DatabaseConnection | null;
  metricsQueries: MetricsQueries | null;
  channelQueries: ChannelQueries | null;
  dbPath: string | null;
}

const backendState: BackendState = {
  connection: null,
  metricsQueries: null,
  channelQueries: null,
  dbPath: null,
};

let mainWindow: BrowserWindow | null = null;

function toError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }
  return new Error(String(cause));
}

function normalizeIsoDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value.includes('T')) {
    return value;
  }

  return `${value.replace(' ', 'T')}Z`;
}

function createDbNotReadyError(): AppError {
  return AppError.create(
    'APP_DB_NOT_READY',
    'Baza danych nie jest gotowa. Uruchom ponownie aplikację.',
    'error',
    { dbPath: backendState.dbPath },
  );
}

function initializeBackend(): Result<void, AppError> {
  if (backendState.connection) {
    return ok(undefined);
  }

  const dbPath = path.join(app.getPath('userData'), DB_FILENAME);
  const connectionResult = createDatabaseConnection({ filename: dbPath });
  if (!connectionResult.ok) {
    return connectionResult;
  }

  const migrationResult = runMigrations(connectionResult.value.db);
  if (!migrationResult.ok) {
    const closeResult = connectionResult.value.close();
    if (!closeResult.ok) {
      logger.warning('Nie udało się zamknąć połączenia DB po błędzie migracji.', {
        error: closeResult.error.toDTO(),
      });
    }
    return migrationResult;
  }

  backendState.connection = connectionResult.value;
  backendState.metricsQueries = createMetricsQueries(connectionResult.value.db);
  backendState.channelQueries = createChannelQueries(connectionResult.value.db);
  backendState.dbPath = dbPath;

  logger.info('Backend gotowy.', {
    dbPath,
    migrationsApplied: migrationResult.value.applied.length,
    migrationsAlreadyApplied: migrationResult.value.alreadyApplied.length,
  });

  return ok(undefined);
}

function closeBackend(): void {
  if (!backendState.connection) {
    return;
  }

  const closeResult = backendState.connection.close();
  if (!closeResult.ok) {
    logger.error('Nie udało się zamknąć bazy danych.', { error: closeResult.error.toDTO() });
  }

  backendState.connection = null;
  backendState.metricsQueries = null;
  backendState.channelQueries = null;
}

function readAppStatus(): Result<AppStatusDTO, AppError> {
  const db = backendState.connection?.db;
  if (!db) {
    return ok({
      version: app.getVersion(),
      dbReady: false,
      profileId: null,
      syncRunning: false,
      lastSyncAt: null,
    });
  }

  try {
    const activeProfileRow = db
      .prepare<[], { id: string }>(
        `
          SELECT id
          FROM profiles
          WHERE is_active = 1
          ORDER BY updated_at DESC, id ASC
          LIMIT 1
        `,
      )
      .get();

    const latestSyncRunRow = db
      .prepare<[], { status: string; finishedAt: string | null }>(
        `
          SELECT
            status,
            finished_at AS finishedAt
          FROM sync_runs
          ORDER BY started_at DESC, id DESC
          LIMIT 1
        `,
      )
      .get();

    const latestChannelSyncRow = db
      .prepare<[], { lastSyncAt: string }>(
        `
          SELECT last_sync_at AS lastSyncAt
          FROM dim_channel
          WHERE last_sync_at IS NOT NULL
          ORDER BY last_sync_at DESC, channel_id ASC
          LIMIT 1
        `,
      )
      .get();

    let lastSyncAt = normalizeIsoDateTime(latestChannelSyncRow?.lastSyncAt ?? null);
    if (!lastSyncAt) {
      const latestFinishedSyncRunRow = db
        .prepare<[], { finishedAt: string }>(
          `
            SELECT finished_at AS finishedAt
            FROM sync_runs
            WHERE finished_at IS NOT NULL
            ORDER BY finished_at DESC, id DESC
            LIMIT 1
          `,
        )
        .get();

      lastSyncAt = normalizeIsoDateTime(latestFinishedSyncRunRow?.finishedAt ?? null);
    }

    return ok({
      version: app.getVersion(),
      dbReady: true,
      profileId: activeProfileRow?.id ?? null,
      syncRunning: Boolean(latestSyncRunRow && latestSyncRunRow.finishedAt === null),
      lastSyncAt,
    });
  } catch (cause) {
    return err(
      AppError.create(
        'APP_STATUS_READ_FAILED',
        'Nie udało się odczytać statusu aplikacji.',
        'error',
        {},
        toError(cause),
      ),
    );
  }
}

function readKpis(query: KpiQueryDTO): Result<KpiResultDTO, AppError> {
  if (!backendState.metricsQueries) {
    return err(createDbNotReadyError());
  }
  return backendState.metricsQueries.getKpis(query);
}

function readTimeseries(query: TimeseriesQueryDTO): Result<TimeseriesResultDTO, AppError> {
  if (!backendState.metricsQueries) {
    return err(createDbNotReadyError());
  }
  return backendState.metricsQueries.getTimeseries(query);
}

function readChannelInfo(query: { channelId: string }) {
  if (!backendState.channelQueries) {
    return err(createDbNotReadyError());
  }
  return backendState.channelQueries.getChannelInfo(query);
}

const ipcBackend: DesktopIpcBackend = {
  getAppStatus: () => readAppStatus(),
  getKpis: (query) => readKpis(query),
  getTimeseries: (query) => readTimeseries(query),
  getChannelInfo: (query) => readChannelInfo(query),
};

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (IS_DEV) {
    void win.loadURL(DEV_SERVER_URL);
  } else {
    void win.loadFile(UI_ENTRY_PATH);
  }

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    registerIpcHandlers(ipcMain, ipcBackend);

    const backendInit = initializeBackend();
    if (!backendInit.ok) {
      logger.error('Nie udało się zainicjalizować backendu.', {
        error: backendInit.error.toDTO(),
      });
    }

    mainWindow = createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });
}

app.on('before-quit', () => {
  closeBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
