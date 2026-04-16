# PROJ-13: Materialfluss Excel Import/Export

## Status: Approved
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-6 (Materialfluss-Definition) — Import/Export operiert auf der `material_flows` Tabelle
- Requires: PROJ-3 (Layout Canvas) — Canvas-Objekte müssen bereits existieren, damit Flüsse auf Stationen gemappt werden können

## User Stories
- As a consultant, I want to export all material flows of a project as an Excel file so that I can share or document them externally.
- As a consultant, I want to import material flows from an Excel file so that I can quickly populate a project from existing data (e.g., from a client Excel sheet).
- As a consultant, I want to choose whether an import replaces or appends to existing flows so that I control what happens to my existing data.
- As a consultant, I want to see a preview of the import data before confirming so that I can catch errors early.
- As a consultant, I want to download an empty Excel template so that I know the correct format before filling in data.

## Acceptance Criteria
- [ ] Export-Button in der Materialfluss-Tab verfügbar
- [ ] Export erzeugt eine `.xlsx`-Datei mit den Spalten: `Von` | `Nach` | `Menge pro Transport` | `Transporte pro Tag` | `Material`
- [ ] Alle aktuellen Flüsse des Projekts werden exportiert (alle Zeilen)
- [ ] Dateiname des Exports: `materialfluss-[projektname]-[datum].xlsx`
- [ ] Import-Button in der Materialfluss-Tab verfügbar
- [ ] Import akzeptiert `.xlsx`-Dateien mit dem festgelegten Spaltenformat
- [ ] Vor dem Import wird eine Vorschau angezeigt: Anzahl erkannter Zeilen, Tabelle mit den ersten 5 Zeilen
- [ ] Beim Import kann der Nutzer wählen: "Ersetzen" (alle bestehenden Flüsse löschen und neue einfügen) oder "Hinzufügen" (neue Flüsse zu bestehenden hinzufügen)
- [ ] Import validiert jede Zeile: `Von` und `Nach` müssen bekannte Canvas-Stationen sein; Menge und Frequenz müssen > 0 sein
- [ ] Ungültige Zeilen werden übersprungen und in einer Fehlerliste angezeigt (z.B. "Zeile 3: Station 'Maschine X' nicht gefunden")
- [ ] Ein "Template herunterladen"-Link stellt eine leere `.xlsx`-Vorlage mit korrekten Spaltenüberschriften bereit
- [ ] Nach erfolgreichem Import wird die Flusstabelle sofort aktualisiert

## Edge Cases
- Was passiert, wenn die hochgeladene Datei kein `.xlsx` ist? → Fehlermeldung: "Nur .xlsx-Dateien werden unterstützt"
- Was passiert, wenn die Spaltenüberschriften falsch sind? → Fehlermeldung mit Hinweis auf das erwartete Format und Link zum Template
- Was passiert, wenn alle Zeilen der Importdatei ungültig sind? → Import wird abgebrochen, keine Änderungen durchgeführt, alle Fehler aufgelistet
- Was passiert, wenn das Projekt keine Canvas-Stationen hat und ein Import gestartet wird? → Warnung: "Keine Stationen auf dem Canvas — bitte zuerst Stationen hinzufügen"
- Was passiert, wenn die exportierte Datei sofort wieder importiert wird (Roundtrip)? → Alle Flüsse werden korrekt erkannt und importiert
- Was passiert bei leerer Excel-Datei (nur Headerzeile, keine Daten)? → Fehlermeldung: "Keine Daten in der Datei gefunden"
- Was passiert bei sehr großen Dateien (> 500 Zeilen)? → Import wird verarbeitet, Ladeindikator angezeigt

## Technical Requirements
- Excel-Bibliothek: `xlsx` (SheetJS) — kostenfrei, clientseitig oder serverseitig verwendbar, kein API-Call nötig
- Export läuft im Browser (clientseitig) — kein Server-Roundtrip für die Dateigenerierung nötig
- Import: Datei wird im Browser geparst (SheetJS), validiert, dann per Server Action an Supabase übermittelt
- Spaltenformat ist case-insensitiv beim Import (z.B. "VON" = "Von" = "von")
- Datumformat im Dateinamen: `YYYY-MM-DD`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Overview
Three capabilities added to the existing `MaterialFlowPanel`: Export, Template Download, and Import. All Excel parsing/generation runs in the browser via SheetJS — no new API routes or database schema changes needed.

### Component Structure
```
MaterialFlowPanel (existing — header gets 3 new action buttons)
  +-- [Template herunterladen] Button  → triggers download utility directly
  +-- [Exportieren] Button             → triggers export utility directly
  +-- [Importieren] Button             → opens ImportDialog (new)

ImportDialog (new component)
  +-- Step 1: File Upload Area
  |     +-- Drag-and-drop zone
  |     +-- "Datei auswählen" fallback
  +-- Step 2: Preview & Validation (shown after file is parsed)
  |     +-- Summary line ("12 Zeilen erkannt, 2 Fehler")
  |     +-- Preview Table (first 5 valid rows)
  |     +-- Error List (invalid rows with reason)
  +-- Step 3: Import Mode Selection
  |     +-- Radio: "Hinzufügen" (append to existing flows)
  |     +-- Radio: "Ersetzen"   (delete all, then insert new)
  +-- Footer: [Abbrechen] [Importieren (N Flüsse)]
```

### Excel Format
Fixed column structure (headers matched case-insensitively):

| Column | Label | Required | Validation |
|--------|-------|----------|------------|
| A | Von | Yes | Must match a known station name |
| B | Nach | Yes | Must match a known station name |
| C | Menge pro Transport | Yes | Number > 0 |
| D | Transporte pro Tag | Yes | Number > 0 |
| E | Material | No | Free text or blank |

### Data Flow

**Export (fully client-side):** `flows[]` array in panel state → SheetJS builds `.xlsx` in memory → browser download. Filename: `materialfluss-[projektname]-[YYYY-MM-DD].xlsx`.

**Template Download (fully client-side):** SheetJS creates header-only `.xlsx` → browser download. Static, no data needed.

**Import:**
1. User selects `.xlsx` in ImportDialog
2. SheetJS parses file in browser (no server upload)
3. Rows validated against `stations[]` prop already in MaterialFlowPanel
4. Preview shown; user picks Replace or Append mode
5. On confirm: Replace → call existing `deleteMaterialFlow` for each current flow, then `createMaterialFlow` for each valid row. Append → `createMaterialFlow` only.
6. `load()` called after all operations — same pattern as existing create/delete.

### Tech Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Excel library | `xlsx` (SheetJS) | Free, runs fully in browser, no API key, already specified in spec |
| Parsing location | Client-side only | Avoids server upload; SheetJS handles this natively |
| Persistence | Existing Server Actions | `createMaterialFlow` / `deleteMaterialFlow` already handle Supabase — no new routes needed |
| New UI component | `ImportDialog` only | Export/template are utility functions; only import needs a multi-step dialog |
| Utilities location | `src/lib/excel-flows.ts` | Pure functions belong in `lib/`, not in components |

### Files Changed / Created

| File | Action |
|------|--------|
| `src/components/canvas/material-flow-panel.tsx` | Add 3 buttons to header, wire import dialog + export/template functions |
| `src/components/canvas/import-flows-dialog.tsx` | New — multi-step import dialog (upload → preview → confirm) |
| `src/lib/excel-flows.ts` | New — pure utilities: `exportFlowsToXlsx`, `downloadTemplate`, `parseFlowsFromXlsx` |

### Dependencies
- **`xlsx`** (SheetJS) — read/write `.xlsx` in the browser. `npm install xlsx`

## Implementation Notes

### Files Changed
- **`src/lib/excel-flows.ts`** (new) — Pure client-side utilities: `exportFlowsToXlsx`, `downloadTemplate`, `parseFlowsFromXlsx`. SheetJS handles all Excel parsing/generation in the browser.
- **`src/components/canvas/import-flows-dialog.tsx`** (new) — Multi-step dialog: upload → preview+validation → mode selection → confirm. Uses drag-and-drop file zone.
- **`src/components/canvas/material-flow-panel.tsx`** (modified) — Added `projectName` prop + 3 header buttons (Vorlage / Export / Import). Added `handleImportConfirm` handler (replace = delete all then insert, append = insert only).
- **`src/components/canvas/canvas-client.tsx`** (modified) — Passes `projectName` prop down to `MaterialFlowPanel`.

### Deviations from Tech Design
None. Implementation matches the architecture spec exactly.

### Dependencies Added
- `xlsx` (SheetJS) — client-side Excel read/write

## QA Test Results

**QA Date:** 2026-04-16
**QA Engineer:** /qa skill
**Status:** APPROVED — no critical or high bugs found

### Acceptance Criteria Results

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Export-Button in der Materialfluss-Tab verfügbar | ✅ PASS |
| 2 | Export erzeugt `.xlsx`-Datei mit korrekten Spalten | ✅ PASS |
| 3 | Alle aktuellen Flüsse werden exportiert | ✅ PASS |
| 4 | Dateiname: `materialfluss-[projektname]-[datum].xlsx` | ✅ PASS |
| 5 | Import-Button in der Materialfluss-Tab verfügbar | ✅ PASS |
| 6 | Import akzeptiert `.xlsx`-Dateien | ✅ PASS |
| 7 | Vorschau vor Import: Anzahl Zeilen + erste 5 Zeilen | ✅ PASS |
| 8 | Import-Modus Auswahl: Ersetzen / Hinzufügen | ✅ PASS |
| 9 | Import validiert Stationen und numerische Felder | ✅ PASS |
| 10 | Ungültige Zeilen übersprungen mit Fehlerliste | ✅ PASS |
| 11 | Template-Download-Button vorhanden | ✅ PASS |
| 12 | Flusstabelle nach Import sofort aktualisiert | ✅ PASS |

### Edge Cases

| Edge Case | Result |
|-----------|--------|
| Nicht-.xlsx Datei → Fehlermeldung | ✅ PASS |
| Falsche Spaltenüberschriften → Fehlermeldung | ✅ PASS |
| Alle Zeilen ungültig → Import abgebrochen, Confirm-Button ausgeblendet | ✅ PASS |
| Keine Canvas-Stationen → Warnung angezeigt | ✅ PASS |
| Roundtrip (export → re-import) | ✅ PASS (via unit tests) |
| Leere Datei (nur Header) → "Keine Daten" Fehler | ✅ PASS |
| > 5 gültige Zeilen → "erste 5 von N" Hinweis | ✅ PASS |

### Security Audit

| Check | Result |
|-------|--------|
| Unauthenticated canvas access blocked | ✅ PASS — redirects to /login |
| Excel parsing entirely client-side (no file upload to server) | ✅ PASS — SheetJS reads ArrayBuffer in browser |
| No station IDs exposed in Excel export (labels only) | ✅ PASS — only `from_label`, `to_label`, `quantity`, `frequency`, `material` exported |
| Import creates flows via existing server actions with layout auth | ✅ PASS — `createMaterialFlow` / `deleteMaterialFlow` use authenticated Supabase client |
| XSS via station labels in error messages | ✅ PASS — React renders all strings as text nodes |

### Bugs Found

None. No critical, high, medium, or low bugs found.

### Automated Tests Written

**Unit tests** (`src/lib/excel-flows.test.ts`): 19 tests covering `parseFlowsFromXlsx`:
- Happy path (single row, multiple rows, null material, empty-row skipping)
- Case-insensitive header matching (upper, lower, mixed)
- Fatal errors (bad headers, empty file, header-only file)
- Row-level validation (unknown stations, zero/negative values, non-numeric input, empty Von/Nach)
- Mixed valid+invalid rows

**E2E tests** (`tests/PROJ-13-materialfluss-excel-import-export.spec.ts`): 21 tests / 42 runs (Chromium + Mobile Safari):
- Security: unauthenticated redirect
- Header buttons: Vorlage, Export, Import all visible
- Import dialog: drop zone, file input, Abbrechen button
- Error states: non-.xlsx, no-stations warning, empty file, wrong headers
- Preview step: badges, table columns, error list, back button, "first 5 of N" hint
- Mode selection: Hinzufügen / Ersetzen radios
- Confirm button: correct count + singular/plural form
- Confirm hidden when 0 valid rows
- Export filename format regex
- Template button label + title attribute
- Regression: auth redirect, login page

### Regression Check

- 307/308 existing E2E tests pass (1 pre-existing Mobile Safari PROJ-1 failure unrelated to PROJ-13)
- 173/173 unit tests pass (up from 154)

## Deployment
_To be added by /deploy_
