# Runbook testów funkcjonalnych (Fazy 0-8) — wersja ultra-prosta

> Ten dokument jest dla osoby, która **nie jest techniczna**. Idziesz punkt po punkcie i tylko zaznaczasz: działa / nie działa.

## 1) Co chcemy osiągnąć?

Chcemy sprawdzić, czy obecna aplikacja jest stabilna i gotowa na Fazę 9.

**Na końcu masz podjąć jedną decyzję:**
- **GO** = można zaczynać Fazę 9,
- **NO-GO** = najpierw trzeba naprawić błędy.

---

## 2) Start — dokładnie te 3 kroki

1. Otwórz terminal w folderze projektu.
2. Uruchom:
   - `corepack pnpm install`
   - `corepack pnpm dev`
3. Sprawdź, czy:
   - otworzyło się okno aplikacji,
   - strona `http://127.0.0.1:5173` działa.

Jeśli to nie działa, **zatrzymaj testy** i zgłoś błąd jako **P0** (blokada startu).

---

## 3) Jak testować (prosta zasada)

Dla każdego obszaru poniżej:
1. Wykonaj kliknięcia z listy.
2. Zapisz wynik: **PASS** albo **FAIL**.
3. Jeśli FAIL, zapisz krótko:
   - co kliknięto,
   - co wyszło,
   - co powinno wyjść.

To wszystko.

---

## 4) Lista obszarów do sprawdzenia

## 4.1 Foundation (czy aplikacja normalnie wstaje)

- Uruchom aplikację.
- Zamknij i uruchom ponownie.
- Odśwież widok.

**PASS:** brak krytycznych błędów, aplikacja nadal działa.

## 4.2 Data Core (dashboard i dane)

- Wejdź na dashboard.
- Sprawdź, czy widać KPI i wykres.
- Zmień zakres dat (np. 7d, 30d, 90d).

**PASS:** dane się odświeżają i wyglądają sensownie.

## 4.3 Data Modes (fake / real / record)

- Przełącz po kolei: `fake` → `real` → `record` → `fake`.
- Po każdej zmianie sprawdź, czy UI się nie zawiesza.
- Uruchom probe.

**PASS:** tryb zmienia się poprawnie, aplikacja się nie "wysypuje".

## 4.4 Sync

- Uruchom synchronizację.
- Sprawdź, czy postęp rośnie.
- Jeśli się da: przerwij i użyj resume.

**PASS:** sync kończy się poprawnie, bez chaosu w danych.

## 4.5 ML baseline

- Uruchom baseline dla `views`.
- Pobierz forecast.
- Zmień metrykę (np. `subscribers`) i porównaj.

**PASS:** forecast zwraca dane i nie ma nielogicznych wyników.

## 4.6 Raporty i eksport

- Wygeneruj raport (30d).
- Wyeksportuj: `json`, `csv`, `html`.
- Sprawdź, czy pliki powstały i nie są puste.

**PASS:** raport i eksport działają, pliki mają treść.

## 4.7 Profile / Settings / Auth

- Utwórz nowy profil.
- Przełącz aktywny profil.
- Zmień ustawienia i sprawdź, czy są osobne dla profili.
- Połącz i rozłącz konto.
- Sprawdź komunikaty użytkownika (powinny być po polsku).

**PASS:** profile są odseparowane, auth działa, komunikaty są zrozumiałe.

---

## 5) Bardzo krótka pomoc AI (opcjonalnie)

Jeśli chcesz, możesz wkleić do AI:
- log z terminala,
- logi aplikacji,
- zrzuty ekranu,
- swoje notatki PASS/FAIL.

Poproś AI o:
1. listę najważniejszych problemów,
2. priorytety P0/P1/P2,
3. decyzję GO/NO-GO z uzasadnieniem.

---

## 6) Twarde sprawdzenie techniczne (musi być zielone)

Uruchom:
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

Jeśli któraś komenda pada, decyzja to **NO-GO**.

---

## 7) Prosta reguła decyzji

### GO (można zaczynać Fazę 9), jeśli:
- wszystkie obszary krytyczne są PASS,
- nie ma otwartych błędów P0/P1,
- 4 komendy techniczne są zielone.

### NO-GO (jeszcze nie), jeśli:
- jest choć 1 błąd P0/P1,
- albo nie przechodzi lint/typecheck/test/build,
- albo krytyczny scenariusz użytkownika się wywala.

---

## 8) Szablon raportu (kopiuj-wklej)

```md
# Raport testów Fazy 0-8 — [DATA]

## Wynik obszarów
- Foundation: PASS/FAIL
- Data Core: PASS/FAIL
- Data Modes: PASS/FAIL
- Sync: PASS/FAIL
- ML baseline: PASS/FAIL
- Raporty/Eksport: PASS/FAIL
- Profile/Settings/Auth: PASS/FAIL

## Błędy krytyczne
- P0/P1: brak / są

## Lista błędów
1. [P0/P1/P2] Tytuł
   - Kroki:
   - Co jest:
   - Co powinno być:
   - Załączniki:

## Decyzja końcowa
- GO / NO-GO
- Uzasadnienie (2-5 zdań)
```
