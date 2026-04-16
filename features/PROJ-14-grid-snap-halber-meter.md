# PROJ-14: Grid-Snap auf 0,5 m

## Status: Architected
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-3 (Layout Canvas) — Änderung der Snap-to-Grid-Konfiguration im Canvas

## User Stories
- As a consultant, I want to snap machines to a 0.5 m grid so that I can position machines with half-meter precision.
- As a consultant, I want to resize machines in 0.5 m steps so that small machines (e.g., 0.5 m × 0.5 m) are correctly positionable.

## Acceptance Criteria
- [ ] Das Snap-Raster beträgt 0,5 m (statt bisher 1 m) — Objekte rasten in 0,5-m-Schritten ein (sowohl beim Platzieren als auch beim Verschieben)
- [ ] Maschinengröße kann in 0,5-m-Schritten eingestellt werden (z.B. Breite: 0,5 m / 1,0 m / 1,5 m ...)
- [ ] Bestehende Layouts (Objekte auf ganzzahligen Meterangaben) bleiben korrekt positioniert — kein Positions-Drift
- [ ] Die visuelle Grid-Anzeige (Hintergrundlinien) zeigt weiterhin 1-m-Hauptlinien an; optional feine 0,5-m-Hilfslinien

## Edge Cases
- Was passiert mit bestehenden Canvas-Objekten nach dem Update? → `pos_x`, `pos_y`, `width`, `height` werden als Dezimalwerte gespeichert; bestehende Integer-Werte (z.B. `pos_x = 3`) sind gültige 0,5-m-Positionen (= 3,0 m) und ändern sich nicht
- Was passiert, wenn ein Objekt bei 0,5 m positioniert ist und das Projekt in einem älteren Stand geöffnet wird? → Kein Problem, da `pos_x`/`pos_y` bereits als `NUMERIC` in der DB gespeichert sind
- Was passiert bei sehr kleinen Maschinen (0,5 m × 0,5 m) auf einem großen Canvas? → Kein Problem — visuelle Größe bleibt nutzbar (30 px bei 100 % Zoom)

## Technical Requirements
- Änderung in `canvas-client.tsx`: `snapGrid` von `[60, 60]` auf `[30, 30]` (0,5 m = 30 px bei CELL_SIZE = 60)
- `CELL_SIZE = 60px` (1 m = 60 px) bleibt unverändert — nur die Snap-Auflösung ändert sich
- PropertiesPanel: Schrittweite (`step`) für Breite/Höhe-Inputs von `1` auf `0.5` ändern
- Keine Datenbankänderung nötig — `pos_x`, `pos_y`, `width`, `height` sind bereits `NUMERIC`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Summary
Surgical, low-risk change touching exactly two places in one file (`canvas-client.tsx`). No database changes, no new components, no new packages.

### Component Structure

```
Canvas (canvas-client.tsx)
+-- Snap logic       CHANGE: snapGrid [60,60] → [30,30]
+-- Drop handler     CHANGE: snap calculation uses 30px (CELL_SIZE/2) steps
+-- Save handler     CHANGE: position stored as Math.round(x/30)*0.5 → 0.5m precision
+-- Background grid  NO CHANGE: gap stays 60px = 1m main gridlines

Machine Type Dialog (machine-type-dialog.tsx)
+-- Width/Height inputs  NO CHANGE: already step=0.5, min=0.5 ✓

Properties Panel (properties-panel.tsx)
+-- Dimensions display   NO CHANGE: read-only display, no step needed
```

### Data Model
No schema change needed. `pos_x`, `pos_y`, `width`, `height` are already `NUMERIC` in Supabase and support decimal values. Existing integer positions (e.g. `pos_x = 3`) are valid 0.5m positions and remain unchanged.

### The Three Precise Changes

| Location | Current | New |
|---|---|---|
| `snapGrid` prop | `[60, 60]` | `[30, 30]` |
| Drop position snap | rounds to 60px steps | rounds to 30px (CELL_SIZE/2) steps |
| Position save formula | `Math.round(x / 60)` → integer meters | `Math.round(x / 30) * 0.5` → 0.5m values |

### Tech Decisions
- `CELL_SIZE = 60` stays unchanged — all canvas size, rendering, and pixel math is unaffected
- Background gap stays at 60px — clean 1m main gridlines, no optional sub-lines in scope
- React Flow's built-in `snapGrid` prop handles drag snapping — no custom logic needed
- No new packages required

### Dependencies
None.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
