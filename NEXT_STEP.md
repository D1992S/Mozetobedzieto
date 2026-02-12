# Nastepny krok — PRZECZYTAJ NAJPIERW

> **Ten plik mowi Ci co robic.** Aktualizuj go na koncu kazdej sesji.

## Aktualny status

| Faza | Nazwa | Status |
|------|-------|--------|
| 0 | Foundation | DONE |
| 1 | Data Core | DONE |
| 2 | Desktop Backend + IPC | DONE |
| 3 | Data Modes + Fixtures | **NASTEPNA** |
| 4-19 | Reszta | Oczekuje |

## Co zostalo zrobione (Faza 0 + 1 + 2)

- Monorepo pnpm workspaces: 10 pakietow + 2 aplikacje.
- TypeScript 5.9 strict, ESLint 9, Prettier, Vitest 4.
- Pakiet `shared`:
  - `Result<T,E>`, `AppError`, IPC kontrakty (4 komendy + 3 eventy), Zod 4 schemas.
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
- Testy:
  - 34 testy pass (w tym nowe testy integracyjne IPC: happy path + invalid payload + core error).
- Build/runtime:
  - Desktop runtime bundlowany przez `esbuild` (`apps/desktop/scripts/build-desktop.mjs`), co umozliwia runtime import `@moze/core`/`@moze/shared`.
- Standard regresji: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Co robic teraz — Faza 3: Data Modes + Fixtures

**Cel:** Szybka iteracja i powtarzalnosc danych (fake/real/record mode) bez zmian po stronie UI.

**Zakres:**
1. Fake mode:
   - fixture loader i instant odpowiedzi providera.
2. Real mode:
   - interfejs providera danych (YouTube API jako docelowy adapter).
3. Record mode:
   - zapis realnych odpowiedzi API do fixture JSON.
4. Provider interface (`DataProvider`):
   - `getChannelStats()`
   - `getVideoStats()`
   - `getRecentVideos()`
5. Cache layer:
   - TTL per endpoint.
6. Rate limiter:
   - token bucket, limity konfigurowalne per provider.
7. Runtime toggle:
   - przelaczanie fake/real/record bez zmian komponentow UI.

**Definition of Done (Faza 3):**
- [ ] Przelaczanie fake/real dziala bez zmian w UI (env + runtime toggle).
- [ ] Record mode tworzy dane odtwarzalne w fake mode.
- [ ] Rate limiter blokuje nadmiar requestow i zostawia log.
- [ ] Testy integracyjne dla fake/real/record przechodza.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — 0 errors.
- [ ] Wpis w `CHANGELOG_AI.md`.
- [ ] Aktualizacja tego pliku (`NEXT_STEP.md`).

**Pliki do modyfikacji/stworzenia:**
```
packages/sync/src/                    — orchestrator trybow danych + provider interface
packages/data-pipeline/src/           — fixture loader i normalizacja danych wejsciowych
packages/shared/src/ipc/contracts.ts  — kontrakty toggle/status trybu danych (jesli potrzebne)
apps/desktop/src/main.ts              — runtime toggle i podpiecie wybranego providera
apps/ui/src/                          — UI przełącznika trybu (przez IPC, bez importu z core/sync)
fixtures/                             — utrzymanie/rozszerzenie golden datasetow dla fake mode
```

**Szczegoly:** `docs/PLAN_REALIZACJI.md` -> Faza 3.

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
| 17 | Plugins (Insights/Alerts) | M6 |
| 18 | Diagnostics + Recovery | M6 |
| 19 | Polish + Packaging | M6 |
