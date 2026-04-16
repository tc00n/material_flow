# PROJ-14: Grid-Snap auf 0,5 m

## Status: Deployed
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

## Implementation Notes
- Added `SNAP_SIZE = CELL_SIZE / 2 = 30` constant in `canvas-client.tsx`
- Changed `snapGrid` prop from `[60, 60]` to `[30, 30]` — React Flow now snaps drag at 0.5m resolution
- Drop handler snap: `Math.round(x / SNAP_SIZE) * SNAP_SIZE` — new items from sidebar also snap at 0.5m
- Save formula: `Math.round(x / SNAP_SIZE) * 0.5` — stores 0.5m precision values (e.g. 3.5 instead of 3)
- `machine-type-dialog.tsx` already had `step={0.5}` and `min={0.5}` — no change needed
- No database changes needed; `pos_x`/`pos_y` are already `NUMERIC` in Supabase
- Background grid gap stays at 60px (1m main lines) — unchanged
- Existing integer positions remain valid (e.g. `pos_x = 3` is `3.0 m`, a valid 0.5m position)

## QA Test Results

**Tested:** 2026-04-16
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### AC-1: Snap-Raster beträgt 0,5 m — Objekte rasten in 0,5-m-Schritten ein
- [x] `SNAP_SIZE = CELL_SIZE / 2 = 30` constant added to `canvas-client.tsx`
- [x] `snapGrid={[SNAP_SIZE, SNAP_SIZE]}` (= [30, 30]) set on ReactFlow component
- [x] Drop handler from sidebar uses `Math.round(rawPosition.x / SNAP_SIZE) * SNAP_SIZE`
- [x] Save formula: `Math.round(n.position.x / SNAP_SIZE) * 0.5` → stores 0.5m precision values
- [x] Unit tests confirm formula produces 0.0, 0.5, 1.0, 1.5 ... values correctly (29 tests)
- [x] E2E source-code verification confirms all three change locations are correct

#### AC-2: Maschinengröße in 0,5-m-Schritten einstellbar
- [x] `machine-type-dialog.tsx` already had `step={0.5}` and `min={0.5}` — no change needed (confirmed by E2E test)

#### AC-3: Bestehende Layouts bleiben korrekt positioniert — kein Positions-Drift
- [x] Integer-meter positions (e.g. `pos_x = 3` → 180 px) produce exactly `3.0 m` via the new formula — verified by unit tests
- [x] All integer meter values (1 m through 10 m) round-trip correctly with zero drift
- [x] No database migration added — `pos_x`/`pos_y` are already `NUMERIC` in Supabase

#### AC-4: Visuelle Grid-Anzeige zeigt weiterhin 1-m-Hauptlinien
- [x] `Background gap={CELL_SIZE}` (60 px = 1 m) unchanged — confirmed by E2E source test
- [x] `CELL_SIZE = 60` constant unchanged

### Edge Cases Status

#### EC-1: Bestehende Canvas-Objekte nach dem Update
- [x] Integer pos_x/pos_y values are valid 0.5m positions (e.g. `3` = `3.0 m`) — no drift, verified by unit tests

#### EC-2: Objekt bei 0,5 m in altem Stand
- [x] No issue — `pos_x`/`pos_y` are already `NUMERIC` in DB, decimal values have always been storable

#### EC-3: Sehr kleine Maschinen (0,5 m × 0,5 m)
- [x] No issue — `machine-type-dialog.tsx` has `min={0.5}` and `step={0.5}`, no change needed

### Security Audit Results
- [x] Authentication: Canvas route still redirects unauthenticated users to `/login` (regression test passes)
- [x] Authorization: No changes to auth or ownership checks — PROJ-3 security fix unaffected
- [x] Input validation: No new user inputs introduced by this change
- [x] No secrets or schema exposed: Source-level change only (constants + formulas)

### Bugs Found

_No bugs found._

### Summary
- **Acceptance Criteria:** 4/4 passed
- **Edge Cases:** 3/3 passed
- **Security:** Pass — no regressions
- **Unit Tests:** 29 new tests added (`src/components/canvas/snap-math.test.ts`) — all pass
- **E2E Tests:** 10 new tests added (`tests/PROJ-14-grid-snap-halber-meter.spec.ts`) — all pass
- **Total Test Suite:** 154 unit tests + all E2E tests pass
- **Production Ready:** YES
- **Recommendation:** Deploy

## Deployment

**Deployed:** 2026-04-16
**Production URL:** https://material-flow-lyart.vercel.app
**Git Tag:** v1.14.0-PROJ-14
**Commit:** 0abc87b feat(PROJ-13): Implement Materialfluss Excel Import/Export (canvas-client.tsx PROJ-14 changes bundled in this commit)
