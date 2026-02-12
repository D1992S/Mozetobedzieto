# Nastepny krok — PRZECZYTAJ NAJPIERW

> **Ten plik mowi Ci co robic.** Aktualizuj go na koncu kazdej sesji.

## Aktualny status

| Faza | Nazwa | Status |
|------|-------|--------|
| 0 | Foundation | DONE |
| 1 | Data Core | DONE |
| 2 | Desktop Backend + IPC | DONE |
| 3 | Data Modes + Fixtures | DONE |
| 4 | Data Pipeline + Feature Engineering | DONE |
| 5 | Sync Orchestrator | DONE |
| 6 | Bazowy ML Framework | DONE |
| 7 | Dashboard + Raporty + Eksport | **NASTEPNA** |
| 8-19 | Reszta | Oczekuje |

## Co zostalo zrobione (Faza 0 + 1 + 2 + 3 + 4 + 5 + 6)

- Monorepo pnpm workspaces: 10 pakietow + 2 aplikacje.
- TypeScript 5.9 strict, ESLint 9, Prettier, Vitest 4.
- Pakiet `shared`:
  - `Result<T,E>`, `AppError`, IPC kontrakty (status/data-mode/sync/ml + eventy sync), Zod 4 schemas.
  - Typed IPC result envelopes (`IpcResult`) dla wszystkich komend.
  - Logger JSON (`createLogger`) z poziomami severity i kontekstem.
- Pakiet `core`:
  - SQLite (`better-sqlite3`) + migracje forward-only + tracking (`schema_migrations`).
  - Schemat: `raw_api_responses`, `profiles`, `app_meta`, `sync_runs`, `dim_channel`, `dim_video`, `fact_channel_day`, `fact_video_day`.
  - Typed repository/mutation layer.
  - Query layer: `getKpis()`, `getTimeseries()`, `getChannelInfo()` z jawnym `ORDER BY`.
  - Fixture seed: `fixtures/seed-data.json` (90 dni, 1 kanal, 50 filmow).
- `apps/desktop` (Faza 2):
  - Inicjalizacja DB + migracje przy starcie aplikacji.
  - IPC handlery: `app:getStatus`, `db:getKpis`, `db:getTimeseries`, `db:getChannelInfo`.
  - Walidacja input/output po obu stronach granicy IPC (main + preload).
  - Ujednolicona serializacja bledow `AppError` bez crashy.
  - `app:getStatus` spiete z realnym stanem DB.
- `apps/ui` (Faza 2):
  - Typed bridge `window.electronAPI` (metody zamiast surowego `invoke(channel, payload)`).
  - Adapter IPC + hooki TanStack Query pobierajace status/KPI/timeseries/channel info.
  - UI czyta dane analityczne wylacznie przez IPC.
- `shared` + `data-pipeline` + `sync` + `desktop` + `ui` (Faza 3):
  - Kontrakty IPC dla data modes:
    - `app:getDataMode`
    - `app:setDataMode`
    - `app:probeDataMode`
  - Provider interface + tryby danych:
    - `fake`, `real`, `record`
    - `DataModeManager` z runtime toggle bez zmiany kontraktow konsumenta.
  - Provider stack:
    - fixture loader/save w `packages/data-pipeline/src/provider-fixture.ts`
    - cache TTL per endpoint
    - rate limiter (token bucket + log warning przy limicie)
    - record provider zapisujacy fixture replayowalne w fake mode
  - Desktop runtime:
    - inicjalizacja data mode managera przy starcie
    - env override:
      - `MOZE_DATA_MODE`
      - `MOZE_FAKE_FIXTURE_PATH`
      - `MOZE_REAL_FIXTURE_PATH`
      - `MOZE_RECORDING_OUTPUT_PATH`
  - UI:
    - sekcja "Tryb danych (Faza 3)" z podgladem trybu i przyciskami przełączania/probe.
- `core` + `data-pipeline` (Faza 4):
  - Migracja `002-data-pipeline-schema`:
    - `stg_channels`
    - `stg_videos`
    - `ml_features`
    - `data_lineage`
  - ETL runner `runDataPipeline()`:
    - ingestion z `dim_channel` / `dim_video` / `fact_channel_day`
    - validation (schema + range + freshness)
    - staging do `stg_*`
    - feature generation do `ml_features` (m.in. `views_7d`, `views_30d`, `subscriber_delta_7d`, `engagement_rate_7d`, `publish_frequency_30d`, `days_since_last_video`)
    - lineage entries dla etapow: `ingest`, `validation`, `staging`, `feature-generation`
  - Deterministycznosc:
    - pipeline usuwa poprzedni feature set (`channel_id + feature_set_version`) i zapisuje wynik stabilnie.
- `sync` + `desktop` + `ui` + `shared` + `core` (Faza 5):
  - Kontrakty IPC dla orchestratora sync:
    - `sync:start`
    - `sync:resume`
    - DTO wyniku komendy sync (`syncRunId`, `status`, `stage`, `recordsProcessed`, `pipelineFeatures`).
  - Rozszerzony `core` repository dla `sync_runs`:
    - `updateSyncRunCheckpoint()`
    - `resumeSyncRun()`
    - `getSyncRunById()`
    - `getLatestOpenSyncRun()`
  - Zaimplementowany orchestrator synchronizacji:
    - stage machine (`collect-provider-data` -> `persist-warehouse` -> `run-pipeline` -> `completed`),
    - checkpointy i resume z `sync_runs`,
    - blokada rownoleglego sync (mutex in-process + kontrola aktywnego run w DB),
    - retry/backoff dla bledow providera,
    - zapis danych providera do warehouse + `raw_api_responses`,
    - automatyczne `runDataPipeline()` po udanym sync.
  - Eventy sync:
    - emisja `sync:progress`, `sync:complete`, `sync:error` do UI przez Electron main.
  - UI:
    - sekcja "Sync orchestrator (Faza 5)" z przyciskami uruchomienia/wznowienia sync,
    - podglad postepu i bledow na zywo (eventy IPC).
- `ml` + `core` + `shared` + `desktop` + `ui` (Faza 6):
  - Migracja `003-ml-framework-schema`:
    - `ml_models`
    - `ml_backtests`
    - `ml_predictions`
  - Pakiet `ml`:
    - `runMlBaseline()` z baseline modelami:
      - `holt-winters` (double exponential smoothing),
      - `linear-regression`,
    - rolling backtesting i metryki:
      - `MAE`, `sMAPE`, `MASE`,
    - quality gate + statusy modelu:
      - `active`, `shadow`, `rejected`,
    - confidence intervals:
      - `p10`, `p50`, `p90`,
    - graceful degradation:
      - status `insufficient_data` przy historii < 30 dni,
    - odczyt prognozy aktywnego modelu:
      - `getLatestMlForecast()`.
  - Kontrakty IPC ML:
    - `ml:runBaseline`
    - `ml:getForecast`
  - Desktop runtime:
    - handlery IPC dla treningu i odczytu prognoz ML.
  - UI:
    - sekcja "ML baseline (Faza 6)" z uruchomieniem treningu i podgladem predykcji.
- Testy:
  - 60 testow pass:
    - integracyjne IPC (w tym nowe handlery data mode),
    - integracyjne sync data modes (fake/real/record, rate limit, cache TTL),
    - integracyjne data-pipeline (end-to-end, deterministycznosc, validation range, validation freshness),
    - integracyjne sync orchestratora (happy path + mutex + resume z checkpointu pipeline),
    - integracyjne ML baseline (training + backtesting + quality gate + graceful degradation).
- Build/runtime:
  - Desktop runtime bundlowany przez `esbuild` (`apps/desktop/scripts/build-desktop.mjs`), co umozliwia runtime import `@moze/core`/`@moze/shared`.
- Standard regresji: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Co robic teraz — Faza 7: Dashboard + Raporty + Eksport

**Cel:** Pierwsza duza wartosc biznesowa: dashboard KPI, wykresy z prognoza i raporty eksportowalne.

**Zakres:**
1. Dashboard KPI:
   - karty KPI z delta i trendem.
2. Wykresy:
   - timeseries z overlay prognoz (`p10/p50/p90`) z Fazy 6.
3. Zakres dat:
   - 7d / 30d / 90d / custom.
4. Raporty:
   - pipeline raportu `sync -> pipeline -> ML -> insights -> render`.
5. Eksport:
   - lokalny eksport raportow (min. JSON/CSV, opcj. HTML/PDF).
6. Testy:
   - integracyjne IPC + testy renderu dashboardu + walidacja eksportu.

**Definition of Done (Faza 7):**
- [ ] Dashboard pokazuje KPI i wykres szeregu czasowego.
- [ ] Wykres pokazuje predykcje z confidence band (`p10/p50/p90`).
- [ ] Dziala przelaczanie zakresu dat.
- [ ] Raport da sie wygenerowac i wyeksportowac lokalnie.
- [ ] Testy dashboardu/eksportu przechodza.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — 0 errors.
- [ ] Wpis w `CHANGELOG_AI.md`.
- [ ] Aktualizacja tego pliku (`NEXT_STEP.md`).

**Pliki do modyfikacji/stworzenia:**
```
apps/ui/src/                          — dashboard KPI + wykresy + controls zakresu
apps/ui/src/hooks/                    — query hooks do danych KPI/timeseries/forecast
packages/shared/src/                  — DTO/kontrakty IPC dla raportow i eksportu
apps/desktop/src/                     — handlery IPC raportow/eksportu
packages/reports/src/                 — generator raportow i serializacja eksportu
```

**Szczegoly:** `docs/PLAN_REALIZACJI.md` -> Faza 7.

## Krytyczne zasady (nie pomijaj)

1. **Jezyk UI = POLSKI** — wszystkie komunikaty user-facing po polsku.
2. **Zod 4** (nie 3) — import z `zod/v4`.
3. **ESLint 9** (nie 10).
4. **Result<T, AppError>** zamiast throw w logice biznesowej.
5. **Explicit ORDER BY** w kazdym SQL.
6. Przeczytaj `AGENTS.md` przed rozpoczeciem pracy.
7. Na koniec sesji: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
8. Na koniec sesji: wpis w `CHANGELOG_AI.md` + aktualizacja tego pliku.

## Pelna mapa faz

Szczegoly: `docs/PLAN_REALIZACJI.md`

| # | Faza | Milestone |
|---|------|-----------|
| 0 | Foundation | M1 |
| 1 | Data Core | M1 |
| 2 | Desktop Backend + IPC | M1 |
| 3 | Data Modes + Fixtures | M2 |
| 4 | Data Pipeline + Feature Engineering | M2 |
| 5 | Sync Orchestrator | M2 |
| 6 | Bazowy ML Framework | M3 |
| 7 | Dashboard + Raporty + Eksport | M3 |
| 8 | Auth + Profile + Settings | M4 |
| 9 | Import + Enrichment + Search | M4 |
| 10 | Anomaly Detection + Trend Analysis | M5 |
| 11 | LLM Assistant | M5 |
| 12 | LLM Guardrails + Cost Control | M5 |
| 13 | Quality Scoring | M5 |
| 14 | Competitor Intelligence | M5 |
| 15 | Topic Intelligence | M5 |
| 16 | Planning System | M6 |
| 17 | Plugins (Insights/Alerts) — SKIP (solo) | M6 |
| 18 | Diagnostics + Recovery | M6 |
| 19 | Polish + Local UX (bez packaging/telemetry) | M6 |
