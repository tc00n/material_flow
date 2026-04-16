# PROJ-13: Materialfluss Excel Import/Export

## Status: Architected
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
