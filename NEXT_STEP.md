# Następny krok — PRZECZYTAJ NAJPIERW

> **Ten plik mówi Ci co robić.** Aktualizuj go na końcu każdej sesji.

## Aktualny status

| Faza | Nazwa | Status |
|------|-------|--------|
| 0 | Foundation | DONE |
| 1 | Data Core | DONE |
| 2 | Desktop Backend + IPC | **DO ZROBIENIA** |
| 3–19 | Reszta | Oczekuje |

## Co zostało zrobione (Faza 0 + 1)

- Monorepo pnpm workspaces: 10 pakietów + 2 aplikacje.
- TypeScript 5.9 strict, ESLint 9, Prettier, Vitest 4.
- Pakiet `shared`: `Result<T,E>`, `AppError`, IPC kontrakty (4 komendy + 3 eventy), Zod 4 schemas.
- Pakiet `shared`: logger JSON (`createLogger`) z poziomami severity i kontekstem.
- Electron shell z security hardening (contextIsolation, sandbox).
- Dopracowany dev/build dla desktopa: runtime build do `dist` + skrypt `pnpm dev` uruchamiający UI i Electron.
- React 19 + Zustand 5 + TanStack Query 5 skeleton.
- Data Core (`packages/core`):
  - `better-sqlite3` + `@types/better-sqlite3`.
  - Connection manager SQLite (`database.ts`).
  - System migracji forward-only + tracking (`schema_migrations`).
  - Initial schema: `raw_api_responses`, `profiles`, `app_meta`, `sync_runs`, `dim_channel`, `dim_video`, `fact_channel_day`, `fact_video_day`.
  - Typed repository/mutation layer (upserts i zapisy operacyjne).
  - Query layer: `getKpis()`, `getTimeseries()` z jawnych `ORDER BY`.
  - Fixture seed: `fixtures/seed-data.json` (90 dni, 1 kanał, 50 filmów).
  - Testy integracyjne in-memory SQLite (idempotentne migracje, seed + odczyt KPI/timeseries).
- 31 testów (unit + integration) — wszystkie pass.
- CI pipeline (`.github/workflows/ci.yml`): lint + typecheck + test + build.
- Standard regresji: `pnpm lint && pnpm typecheck && pnpm test` (egzekwowane również w CI).

## Co robić teraz — Faza 2: Desktop Backend + IPC

**Cel:** Bezpieczny i typowany most UI ↔ backend na działającym Data Core.

**Zakres:**
1. Podłącz `packages/core` do procesu main w `apps/desktop` (inicjalizacja DB + migracje przy starcie app).
2. Dodaj IPC router/registry dla komend:
   - `app:getStatus`
   - `db:getKpis`
   - `db:getTimeseries`
   - `db:getChannelInfo`
3. Waliduj input/output przez kontrakty z `@moze/shared` po obu stronach granicy IPC.
4. Ujednolić obsługę błędów: `Result<T, AppError>` + serializacja przez IPC bez crashy.
5. Dodać adapter po stronie UI (TanStack Query hooks korzystające wyłącznie z `window.electronAPI`).
6. Dodać testy integracyjne IPC (happy path + invalid payload + błąd z core).

**Definition of Done (Faza 2):**
- [ ] UI pobiera KPI/timeseries wyłącznie przez IPC.
- [ ] Invalid input zwraca `AppError` (bez crash).
- [ ] Jest działający `app:getStatus` spięty z realnym stanem DB.
- [ ] Testy integracyjne IPC przechodzą.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` — 0 errors.
- [ ] Wpis w `CHANGELOG_AI.md`.
- [ ] Aktualizacja tego pliku (`NEXT_STEP.md`).

**Pliki do modyfikacji/stworzenia:**
```
apps/desktop/src/main.ts            — inicjalizacja DB + IPC handlery
apps/desktop/src/preload.ts         — typed bridge, allowlist kanałów/eventów
apps/ui/src/                        — query hooks + konsumowanie IPC
packages/shared/src/ipc/contracts.ts — kontrakty wejścia/wyjścia (jeśli wymagają doprecyzowania)
packages/core/src/index.ts          — stabilne eksporty API dla desktop backend
```

**Szczegóły:** `docs/PLAN_REALIZACJI.md` → Faza 2.

## Krytyczne zasady (nie pomijaj!)

1. **Język UI = POLSKI** — wszelkie komunikaty widoczne dla użytkownika po polsku.
2. **Zod 4** (nie 3) — API: `z.iso.date()`, `z.iso.datetime()`, `z.url()`, import z `zod/v4`.
3. **ESLint 9** (nie 10) — typescript-eslint nie wspiera ESLint 10.
4. **Result<T, AppError>** zamiast throw w logice biznesowej.
5. **Explicit ORDER BY** w każdym zapytaniu SQL.
6. Przeczytaj `AGENTS.md` przed rozpoczęciem pracy.
7. Na koniec sesji: `pnpm lint && pnpm typecheck && pnpm test`.
8. Na koniec sesji: wpis w `CHANGELOG_AI.md` + aktualizacja tego pliku.

## Pełna mapa faz

Szczegóły: `docs/PLAN_REALIZACJI.md`

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
