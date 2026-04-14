# PROJ-3: Layout Canvas (Drag & Drop)

## Status: Deployed
**Created:** 2026-04-14
**Last Updated:** 2026-04-14
**Deployed:** 2026-04-14
**Tag:** v1.3.0-PROJ-3

## Dependencies
- Requires: PROJ-2 (Projekt-Dashboard) — Canvas wird innerhalb eines Projekts geöffnet

## User Stories
- As a consultant, I want to see a grid-based canvas representing the factory floor so that I can place machines spatially.
- As a consultant, I want to drag and drop machines/stations onto the canvas so that I can build a production layout.
- As a consultant, I want to move placed machines by dragging them so that I can adjust the layout.
- As a consultant, I want to resize the canvas area so that I can represent different factory sizes.
- As a consultant, I want the canvas to scale (zoom in/out) so that I can work on large and detailed layouts.
- As a consultant, I want my layout to be automatically saved so that I don't lose work.

## Acceptance Criteria
- [ ] Canvas zeigt ein Raster (Grid) als Fabrikhallen-Grundriss
- [ ] Rasterbreite und -höhe sind konfigurierbar (z.B. 1 Rastereinheit = 1 Meter)
- [ ] Maschinen/Stationen können per Drag & Drop aus einer Seitenleiste auf den Canvas gezogen werden
- [ ] Platzierte Objekte können auf dem Canvas frei verschoben werden (Snap-to-Grid)
- [ ] Objekte können nicht außerhalb der Canvasgrenzen platziert werden
- [ ] Zoom In/Out ist möglich (Mausrad oder Buttons, min. 25%, max. 200%)
- [ ] Pan (Verschieben des sichtbaren Bereichs) ist per Maus möglich
- [ ] Layout wird automatisch gespeichert (Debounce nach Änderung, max. 2 Sekunden Verzögerung)
- [ ] Speicher-Status wird angezeigt ("Gespeichert" / "Speichern..." / "Fehler")
- [ ] Objekte können auf dem Canvas selektiert werden (Klick → Highlight)
- [ ] Selektiertes Objekt kann per Entf-Taste oder Button gelöscht werden

## Edge Cases
- Was passiert, wenn zwei Objekte überlappen? → Visuelle Warnung (rote Umrandung), aber kein Blockieren
- Was passiert beim Schließen des Browsers ohne Speichern? → Auto-Save verhindert Datenverlust
- Was passiert auf kleinen Bildschirmen (< 1280px)? → Hinweis: "Für optimale Nutzung Desktop-Browser verwenden"
- Was passiert, wenn sehr viele Objekte (> 100) auf dem Canvas sind? → Performance-Test erforderlich

## Technical Requirements
- Canvas-Implementierung: React Flow oder Konva.js (kein SVG-only)
- Snap-to-Grid mit konfigurierbarer Rastergröße
- Auto-Save mit Debounce (2s), Daten in Supabase
- Performance: Ruckelfrei bei bis zu 100 Objekten auf dem Canvas

---
## Tech Design (Solution Architect)
**Designed:** 2026-04-14

### Component Structure

```
Canvas Page  (/projects/[id]/canvas)
+-- CanvasHeader
|   +-- Breadcrumb (Dashboard → Project Name)
|   +-- SaveStatusBadge  ("Gespeichert" / "Speichern..." / "Fehler")
|   +-- ZoomControls  (– / % / +)
|
+-- MachineSidebar  (left panel)
|   +-- CategoryFilter  (tabs: Maschinen / Quellen / Senken)
|   +-- DraggableMachineItem  (× N items)
|
+-- CanvasArea  (center, fills remaining space)
|   +-- GridBackground  (visual grid lines)
|   +-- MachineNode  (× N placed objects)
|   |   +-- Normal state  (label + icon)
|   |   +-- Selected state  (blue highlight)
|   |   +-- Overlap state   (red border warning)
|   +-- PanZoomControls  (mouse wheel + drag-to-pan)
|
+-- PropertiesPanel  (right panel, visible when object selected)
    +-- ObjectLabel  (editable name)
    +-- ObjectDimensions  (width × height in meters)
    +-- DeleteButton
```

### Data Model

**canvas_layouts** — one record per project:
- `id`, `project_id` (FK to projects)
- `grid_cell_size` (meters per grid unit, e.g. 1.0)
- `canvas_width`, `canvas_height` (in grid units)
- `created_at`, `updated_at`

**canvas_objects** — one row per placed machine/station:
- `id`, `canvas_layout_id` (FK)
- `type` (enum: machine | source | sink)
- `label` (display name)
- `pos_x`, `pos_y` (position in grid units)
- `width`, `height` (size in grid units)
- `color` (optional hex)
- `created_at`, `updated_at`

### Tech Decisions

| Decision | Choice | Why |
|---|---|---|
| Canvas library | **React Flow** (`@xyflow/react`) | Built-in pan, zoom, drag & drop, snap-to-grid, node selection — avoids building all of this from scratch. Performs well at 100+ objects. |
| Snap-to-grid | React Flow native `snapGrid` prop | No custom math needed; configure with grid cell size |
| Auto-save | 2-second debounce → Supabase `upsert` | Prevents excessive DB writes; debounce hook is reusable across features |
| State management | React `useState` + `useCallback` | Canvas state is local to the page; no global store needed |
| Drag from sidebar | HTML5 drag events + React Flow `onDrop` | Documented pattern in React Flow; sidebar items carry type/label metadata |
| Overlap detection | Bounding-box intersection check on placement/move | Simple 2D rectangle check triggers a visual warning (red border) — not a hard block |

### New Dependencies
- `@xyflow/react` — React Flow v12 canvas library

### Page Route
`/projects/[id]/canvas` — protected route, loads canvas layout for given project ID.

### Auto-Save Flow
1. User moves/places/deletes object → React state updates immediately (optimistic)
2. Debounce timer resets to 2 seconds
3. Timer fires → Supabase upsert of affected records
4. SaveStatusBadge: "Speichern..." → "Gespeichert"
5. On error: "Fehler" shown with retry option

## Implementation Notes (Frontend)
**Implemented:** 2026-04-14

### What was built
- Route `/projects/[id]/canvas` (protected, server component → client component)
- `@xyflow/react` v12 used for canvas — handles pan, zoom, snap-to-grid, drag & drop
- **CELL_SIZE = 60px** per grid unit (1 m) at 100% zoom
- Canvas default size: 50×30 grid units
- `MachineSidebar` — left panel with hardcoded machine/source/sink items (PROJ-4 will replace with DB-backed library)
- `MachineNode` — custom React Flow node with type-specific icon and color
- `CanvasHeader` — breadcrumb, save status badge (saved/saving/error), zoom ±% controls
- `PropertiesPanel` — right panel on selection: editable label, dimensions, delete button
- Auto-save: 2s debounced Supabase upsert (delete-all + reinsert pattern)
- Overlap detection: bounding-box check, red border warning on affected nodes
- Canvas boundary clamping: dropped/moved objects cannot exceed `canvas_width × canvas_height`
- Keyboard: `Delete` key removes selected node (guarded against input focus)

### Deviations from spec
- Machine library (sidebar items) is hardcoded with representative types — PROJ-4 will replace
- Boundary clamping applies on drop; on drag the user can freely drag but snap-to-grid keeps it aligned

### New files
- `src/app/(protected)/projects/[id]/canvas/page.tsx`
- `src/components/canvas/canvas-client.tsx`
- `src/components/canvas/machine-node.tsx`
- `src/components/canvas/canvas-header.tsx`
- `src/components/canvas/machine-sidebar.tsx`
- `src/components/canvas/properties-panel.tsx`
- `src/app/actions/canvas.ts`
- `src/hooks/use-debounce.ts`

### Backend
Tables created by `/backend` on 2026-04-14 — canvas can now persist data to Supabase.

## Backend Implementation Notes
**Implemented:** 2026-04-14

### Migration: `create_canvas_tables`
- **`canvas_layouts`** — one row per project (UNIQUE on `project_id`), FK to `projects` with CASCADE delete
  - Columns: `id`, `project_id`, `grid_cell_size` (NUMERIC, default 1.0), `canvas_width` (default 50), `canvas_height` (default 30), `created_at`, `updated_at`
- **`canvas_objects`** — one row per placed element, FK to `canvas_layouts` with CASCADE delete
  - Columns: `id`, `canvas_layout_id`, `type` (enum: machine|source|sink), `label`, `pos_x`, `pos_y`, `width`, `height`, `color` (nullable), `created_at`, `updated_at`
  - **Architektur-Entscheidung (2026-04-14):** `source` und `sink` als Typ-Werte werden nicht mehr verwendet (PROJ-5 cancelled). Alle Objekte verwenden `type = 'machine'`. Die Enum-Werte bleiben in der DB erhalten; eine Migration auf z.B. `machine|storage|workstation` ist optional und rein kosmetisch. Fixierte Objekte für die Optimierung werden in PROJ-9 als Randbedingungen zur Laufzeit angegeben — nicht durch den Typ vorab.
- RLS enabled on both tables; policies restrict access to objects owned by the authenticated user (via `projects.user_id = auth.uid()`)
- Indexes: `idx_canvas_layouts_project_id`, `idx_canvas_objects_layout_id`, `idx_canvas_objects_type`

### Server Actions (`src/app/actions/canvas.ts`)
- `getOrCreateCanvasLayout(projectId)` — fetches or creates a canvas layout + all its objects
- `saveCanvasObjects(layoutId, objects)` — delete-all + reinsert pattern (debounced 2s on client)

## QA Test Results
**QA Date:** 2026-04-14
**QA Engineer:** /qa skill

### Acceptance Criteria Results

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| AC-1 | Canvas zeigt ein Raster (Grid) als Fabrikhallen-Grundriss | PASS | React Flow `<Background variant={BackgroundVariant.Lines}>` at 60px gap |
| AC-2 | Rasterbreite und -höhe sind konfigurierbar | PARTIAL FAIL | `canvas_width`/`canvas_height` are in DB and sent to client, but **no UI exists to change them**. Also `grid_cell_size` stored in DB is never used — `CELL_SIZE = 60` is hardcoded. See Bug #2 |
| AC-3 | Drag & Drop aus Seitenleiste auf Canvas | PASS | HTML5 drag events + React Flow `onDrop`; sidebar has 3 tabs (Maschinen/Quellen/Senken) |
| AC-4 | Platzierte Objekte per Drag verschieben (Snap-to-Grid) | PASS | `snapToGrid` + `snapGrid={[60,60]}` enabled on ReactFlow |
| AC-5 | Objekte können nicht außerhalb der Canvasgrenzen platziert werden | PARTIAL FAIL | Boundary clamping only on **drop**, not on drag-move. Object can be dragged outside bounds and released there. See Bug #1 |
| AC-6 | Zoom In/Out (Mausrad, Buttons, min 25%, max 200%) | PASS | `minZoom={0.25}`, `maxZoom={2}`, ZoomIn/ZoomOut buttons in header |
| AC-7 | Pan per Maus möglich | PASS | `panOnDrag` enabled |
| AC-8 | Auto-Save (Debounce 2s) | PASS | `useDebounce(performSave, 2000)` fires after 2s; saves on drop, move-end, delete, label change |
| AC-9 | Speicher-Status angezeigt | PASS | Badge shows: "Gespeichert" / "Speichern..." / "Nicht gespeichert" / "Fehler" |
| AC-10 | Objekte können selektiert werden (Klick → Highlight) | PASS | Selected node gets amber border + glow; PropertiesPanel opens |
| AC-11 | Löschen per Entf-Taste oder Button | PASS | Delete key (guarded against input focus) + "Element löschen" button in PropertiesPanel |

### Edge Case Results

| Edge Case | Status | Notes |
|-----------|--------|-------|
| Zwei Objekte überlappen → rote Umrandung | PASS | `doNodesOverlap` bounding-box check; `hasOverlap` flag → red border + "Überlappung erkannt" label |
| Browser schließen → Auto-Save verhindert Datenverlust | PASS | 2s debounce; save fires on any change |
| Kleine Bildschirme (< 1280px) → Hinweis | PASS | `xl:hidden` warning banner: "Für optimale Nutzung Desktop-Browser verwenden" |
| Viele Objekte (> 100) → Performance | NOT TESTED | Performance test requires manual testing with a configured Supabase instance |

### Bugs Found

#### Bug #1 — Medium: Boundary clamping not enforced during drag-move
- **Severity:** Medium
- **Steps to reproduce:** Place a machine on the canvas near the right edge. Drag it past the right boundary. Release. Object is placed outside the canvas boundary.
- **Expected:** Object snaps back to the nearest in-bounds position on release
- **Actual:** Object is placed wherever it's dropped, including outside the boundary dashed line
- **Location:** `canvas-client.tsx:149-169` — `handleNodesChange` applies React Flow's native drag without boundary enforcement. Only `handleDrop` (`canvas-client.tsx:173-218`) has boundary clamping.
- **Note:** This deviation is documented in Implementation Notes but violates AC-5

#### Bug #2 — Medium: `grid_cell_size` from database is never applied; no UI to configure canvas dimensions
- **Severity:** Medium
- **Steps to reproduce:** The `canvas_layouts` table stores `grid_cell_size`, `canvas_width`, and `canvas_height`. No UI exists in the canvas to modify these values.
- **Expected per AC-2:** "Rasterbreite und -höhe sind konfigurierbar"
- **Actual:** Canvas is always 50×30 grid units (hardcoded defaults). `grid_cell_size` column exists in DB but the constant `CELL_SIZE = 60` is hardcoded in `canvas-client.tsx:25`
- **Location:** `canvas-client.tsx:25` — `const CELL_SIZE = 60`
- **Note:** This is a missing feature rather than a regression — the spec called for configurability that was not implemented

#### Bug #3 — High: `saveCanvasObjects` server action lacks ownership verification
- **Severity:** High (Security)
- **Steps to reproduce:** Any authenticated user can call `saveCanvasObjects(layoutId, objects)` with another user's `layoutId`.
- **Expected:** Server action verifies the `layoutId` belongs to the authenticated user via RLS or explicit ownership check
- **Actual:** `canvas.ts:76-107` — `saveCanvasObjects` calls `supabase.from('canvas_objects').delete().eq('canvas_layout_id', layoutId)` with no user ownership check. If Supabase RLS is correctly configured this is mitigated, but there is no explicit server-side guard.
- **Location:** `src/app/actions/canvas.ts:76-107`
- **Note:** Supabase RLS policies (set up during backend phase) should prevent this at the DB level, but the server action itself has no explicit user verification as a defense-in-depth measure. Needs confirmation that RLS policies correctly chain `canvas_objects → canvas_layouts → projects → user_id = auth.uid()`

#### Bug #4 — Low: Canvas boundary indicator doesn't pan/zoom with canvas content
- **Severity:** Low (Visual)
- **Steps to reproduce:** Pan the canvas view. The dashed boundary rectangle stays fixed at the top-left of the viewport instead of moving with the canvas content.
- **Expected:** Boundary indicator should be anchored to the canvas coordinate system (moves with pan/zoom)
- **Actual:** `canvas-client.tsx:303-314` — boundary div is a direct child of `<ReactFlow>`. React Flow renders direct children as overlay elements (fixed position over the pane), not as canvas-world elements. The boundary doesn't match the actual canvas area after panning.
- **Location:** `canvas-client.tsx:303-314`

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| Auth guard on canvas page | PASS | `ProtectedLayout` checks `supabase.auth.getUser()` |
| Project ownership verification | PASS | `canvas/page.tsx` queries project with `.eq('user_id', user.id)` |
| `saveCanvasObjects` ownership check | FAIL | See Bug #3 — relies solely on Supabase RLS |
| RLS on `canvas_layouts` | ASSUMED PASS | Backend spec states RLS is enabled; not directly verifiable without Supabase connection |
| XSS in label input | PASS | React escapes all node data; no `dangerouslySetInnerHTML` usage |
| Injection in positions | PASS | Positions are numeric (from drag calculations), stored as numbers |
| Env with no Supabase configured | FAIL (500 error) | Without `NEXT_PUBLIC_SUPABASE_URL`, the `ProtectedLayout` throws unhandled 500 instead of a graceful error page. This is a Low/Medium environmental hardening issue. |

### Automated Tests

**Unit tests** (`src/hooks/use-debounce.test.ts`):
- 7 tests written for `useDebounce` hook
- All 7 pass: ✅

**E2E tests** (`tests/PROJ-3-layout-canvas.spec.ts`):
- 11 tests written
- 8 pass: ✅
- 3 skipped (require Supabase env vars): ⏭️
- 0 fail: ✅

### Summary

| Category | Count |
|----------|-------|
| Acceptance criteria tested | 11 |
| AC Passed (full) | 9 |
| AC Partial Fail | 2 (AC-2, AC-5) |
| Bugs found | 4 |
| Critical | 0 |
| High | 1 (Bug #3 — security) |
| Medium | 2 (Bug #1, Bug #2) |
| Low | 1 (Bug #4) |

### Production-Ready Decision

**READY** — Bug #3 (High security) fixed on 2026-04-14. Remaining bugs (Bug #1, #2, #4) are Medium/Low and deferred to a future sprint.

## Deployment
_To be added by /deploy_
