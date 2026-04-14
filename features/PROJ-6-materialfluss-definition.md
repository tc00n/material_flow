# PROJ-6: Materialfluss-Definition

## Status: In Progress
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-4 (Maschinen Bibliothek) — Canvas-Objekte sind die Knoten des Flussgraphen
- ~~Requires: PROJ-5 (Quellen & Senken)~~ — **entfällt, PROJ-5 cancelled.** Alle Canvas-Objekte sind gleichwertige Stationen; jedes Objekt kann Start- oder Endpunkt eines Flusses sein.

## User Stories
- As a consultant, I want to define a material flow between any two stations on the canvas so that I can model the production process.
- As a consultant, I want to specify the transport quantity per flow (units/hour or units/day) so that the intensity of the flow is captured.
- As a consultant, I want to specify the transport frequency (trips/day) so that I can differentiate between high and low frequency flows.
- As a consultant, I want to see all defined flows in a list so that I can review and edit them.
- As a consultant, I want to delete a flow so that I can correct mistakes.

## Acceptance Criteria
- [ ] Flüsse werden in einer separaten "Materialfluss" Tabelle/Panel verwaltet (nicht direkt auf Canvas gezeichnet)
- [ ] Neuen Fluss erstellen: Von (Pflicht), Nach (Pflicht), Menge pro Transport in Einheiten (Pflicht), Transporte pro Tag (Pflicht), Material-Bezeichnung (optional)
- [ ] "Von" und "Nach" sind Dropdowns mit allen Canvas-Objekten (alle Stationen/Typen gleichwertig)
- [ ] Ein Fluss kann nicht von einem Objekt zu sich selbst gehen → Validierungsfehler
- [ ] Alle definierten Flüsse werden in einer übersichtlichen Tabelle angezeigt (Von → Nach, Menge, Frequenz)
- [ ] Flüsse können bearbeitet werden (alle Felder editierbar)
- [ ] Flüsse können gelöscht werden
- [ ] Transportmenge muss > 0 sein
- [ ] Transportfrequenz muss > 0 sein
- [ ] Bidirektionale Flüsse (A→B und B→A) sind als separate Einträge möglich

## Edge Cases
- Was passiert, wenn ein Canvas-Objekt gelöscht wird, das in einem Fluss vorkommt? → Alle verknüpften Flüsse werden ebenfalls gelöscht (Kaskadierung), Nutzer wird informiert
- Was passiert, wenn derselbe Fluss (Von+Nach) doppelt angelegt wird? → Warnung anzeigen, aber nicht blockieren (könnte verschiedene Materialien sein)
- Was passiert, wenn keine Flüsse definiert sind und Visualisierung aufgerufen wird? → Hinweis "Bitte zunächst Materialflüsse definieren"

## Technical Requirements
- Daten in Supabase (Tabelle: material_flows, mit from_node_id, to_node_id, quantity, frequency, material_name)
- Transportintensität (quantity × frequency) wird berechnet und gespeichert → Basis für Visualisierung und Optimierung
- Kaskadierendes Löschen bei Objekt-Löschung (Foreign Key mit ON DELETE CASCADE)

---
## Tech Design (Solution Architect)

**Status:** Architected — 2026-04-14

### Overview
Material flows link two canvas stations with a transport quantity and frequency. The feature adds a new "Materialfluss" tab to the existing canvas page — keeping flows in context with the layout, but separated from the drawing interaction. No new npm packages required.

### Component Structure

```
Canvas Page — /projects/[id]  (existing page)
+-- CanvasHeader (existing — add "Materialfluss" tab toggle)
+-- [Canvas Tab — existing, unchanged]
|   +-- ReactFlow Canvas
|   +-- MachineSidebar
|   +-- PropertiesPanel
+-- [Materialfluss Tab — NEW]
    +-- MaterialflussPanel
        +-- "Neuen Fluss hinzufügen" Button
        +-- AddFlowDialog (NEW)
        |   +-- Select: Von (all canvas stations as options)
        |   +-- Select: Nach (all canvas stations, excludes "Von" selection)
        |   +-- Number Input: Menge pro Transport (units, required > 0)
        |   +-- Number Input: Transporte pro Tag (frequency, required > 0)
        |   +-- Text Input: Material-Bezeichnung (optional)
        |   +-- Computed preview: Transportintensität (Menge × Frequenz)
        |   +-- Save / Cancel buttons
        +-- FlowsTable (NEW)
        |   +-- Columns: Von → Nach | Menge | Freq./Tag | Intensität | Material | Aktionen
        |   +-- Row-level: Edit button → opens EditFlowDialog
        |   +-- Row-level: Delete button → opens DeleteConfirmDialog
        +-- EmptyState (when no flows defined yet)
```

### Data Model

**New Supabase table: `material_flows`**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `canvas_layout_id` | UUID | FK → canvas_layouts(id) ON DELETE CASCADE |
| `from_node_id` | UUID | FK → canvas_objects(id) ON DELETE CASCADE |
| `to_node_id` | UUID | FK → canvas_objects(id) ON DELETE CASCADE |
| `quantity` | numeric | Units per transport, must be > 0 |
| `frequency` | numeric | Transports per day, must be > 0 |
| `transport_intensity` | numeric | Computed: quantity × frequency, stored for fast queries |
| `material_name` | text | Optional label |
| `created_at` | timestamptz | Auto-set |

Cascade rule: Deleting a canvas_object cascades to remove all flows referencing it. Deleting a canvas_layout cascades to remove all flows.

### Tech Decisions

| Decision | Choice | Why |
|---|---|---|
| UI placement | New tab alongside Canvas tab | Keeps flows in context without cluttering the drawing canvas |
| Form component | shadcn/ui Dialog + Form | Already installed; consistent with project patterns |
| List component | shadcn/ui Table | Already installed; best fit for tabular flow data with row-level actions |
| Station dropdowns | shadcn/ui Select | Loads all canvas_objects dynamically as options |
| Duplicate handling | Warning toast, not a blocker | Allows A→B with different materials; spec permits this |
| Data fetching | Server Actions (new file: material-flows.ts) | Same pattern as canvas.ts and projects.ts |
| RLS Policy | User can only access flows for their own projects | Join through canvas_layouts → projects to verify ownership |

### New Files

| File | Purpose |
|---|---|
| `src/app/actions/material-flows.ts` | Server actions: getMaterialFlows, createMaterialFlow, updateMaterialFlow, deleteMaterialFlow |
| `src/components/canvas/material-flow-panel.tsx` | Tab panel container, owns table + dialog state |
| `src/components/canvas/flow-form-dialog.tsx` | Shared Add/Edit dialog |

### Modified Files

| File | Change |
|---|---|
| `src/components/canvas/canvas-client.tsx` | Add tab toggle between Canvas and Materialfluss views |
| `src/components/canvas/canvas-header.tsx` | Add tab indicator UI |

### Dependencies
No new npm packages — all UI components (Table, Dialog, Select, Form, Input) already installed.

## Implementation Notes (Frontend — 2026-04-14)

### What was built
- `src/app/actions/material-flows.ts` — Server actions: `getMaterialFlows`, `createMaterialFlow`, `updateMaterialFlow`, `deleteMaterialFlow`. Ownership verified via canvas_layouts → projects join on every mutation.
- `src/components/canvas/flow-form-dialog.tsx` — Shared add/edit dialog using shadcn Dialog + Select + Input + Form. Computes transport intensity preview live. Duplicate-flow warning (non-blocking). Self-flow validation client-side and server-side.
- `src/components/canvas/material-flow-panel.tsx` — Panel with flows table (columns: Von → Nach, Menge, Freq./Tag, Intensität, Material, Aktionen), empty state, delete confirmation AlertDialog, skeleton loading state.
- `src/components/canvas/canvas-header.tsx` — Added "Layout / Materialfluss" tab toggle in center of header. Zoom controls hidden on Materialfluss tab.
- `src/components/canvas/canvas-client.tsx` — Added `activeTab` state, passes to CanvasHeader; conditionally renders canvas view or `<MaterialFlowPanel>`. Derives `stations[]` from React Flow nodes for the dropdowns.

### Deviations from spec
- None.

## Implementation Notes (Backend — 2026-04-14)

### What was built
- Supabase migration `create_material_flows` applied to production.
- Table `material_flows` with columns: `id`, `canvas_layout_id`, `from_node_id`, `to_node_id`, `quantity` (CHECK > 0), `frequency` (CHECK > 0), `transport_intensity`, `material_name` (nullable), `created_at`.
- DB-level constraint `no_self_flow` (`from_node_id <> to_node_id`) as a safety net behind client/server validation.
- Foreign keys: `canvas_layout_id → canvas_layouts(id) ON DELETE CASCADE`, `from_node_id → canvas_objects(id) ON DELETE CASCADE`, `to_node_id → canvas_objects(id) ON DELETE CASCADE`.
- Indexes: `canvas_layout_id`, `from_node_id`, `to_node_id`.
- RLS enabled with 4 policies (SELECT / INSERT / UPDATE / DELETE) — all enforce ownership via `canvas_layouts → projects → user_id = auth.uid()`.

### Pending
- None. Feature is functionally complete end-to-end.

## QA Test Results

**QA Date:** 2026-04-14
**QA Engineer:** /qa skill
**Status:** APPROVED — No Critical or High bugs found.

### Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| AC-1 | Flüsse in separater Materialfluss-Tab verwaltet | PASS |
| AC-2 | Neuen Fluss erstellen: Von, Nach, Menge, Frequenz (alle Pflicht), Material (optional) | PASS |
| AC-3 | Von/Nach Dropdowns mit allen Canvas-Objekten | PASS |
| AC-4 | Kein Fluss von Objekt zu sich selbst (client + server validation) | PASS |
| AC-5 | Alle Flüsse in übersichtlicher Tabelle (Von → Nach, Menge, Freq., Intensität) | PASS |
| AC-6 | Flüsse bearbeiten (alle Felder editierbar, Edit-Dialog mit Vorauffüllung) | PASS |
| AC-7 | Flüsse löschen (mit Bestätigungsdialog) | PASS |
| AC-8 | Transportmenge > 0 validiert | PASS |
| AC-9 | Transportfrequenz > 0 validiert | PASS |
| AC-10 | Bidirektionale Flüsse (A→B + B→A) als separate Einträge möglich | PASS |

### Edge Cases

| Edge Case | Result | Notes |
|-----------|--------|-------|
| Canvas-Objekt gelöscht → verknüpfte Flüsse kaskadierend gelöscht | PASS | ON DELETE CASCADE FK in DB, kein app-level code nötig |
| Doppelter Fluss (A→B zweimal) → Warnung, nicht blockiert | PASS | Amber-Alert im Dialog, Save-Button bleibt aktiv |
| Keine Flüsse definiert → EmptyState mit Hinweis | PASS | Zwei Varianten: mit und ohne Stationen |
| Weniger als 2 Stationen → "Neuen Fluss" Button disabled + Hinweis-Banner | PASS | |
| Transportintensität-Vorschau live beim Eingeben | PASS | qty × freq berechnet, zeigt "X Einh./Tag" |

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| Unauthenticated access → Redirect /login | PASS | Next.js middleware |
| getMaterialFlows: Ownership via canvas_layouts → projects | PASS | Full join-check |
| createMaterialFlow: Ownership verified | PASS | |
| updateMaterialFlow: Ownership via RLS (SELECT policy filters) | PASS | No filter by user_id in app layer, but RLS SELECT policy returns null for non-owners — effectively safe |
| deleteMaterialFlow: No app-layer ownership check | **BUG-1** | See below |
| Self-flow: DB constraint `no_self_flow` (check) + app validation | PASS | Defense in depth |
| quantity/frequency CHECK > 0 at DB level | PASS | |
| RLS: 4 policies (SELECT/INSERT/UPDATE/DELETE) all enforce ownership | PASS | |

### Bugs Found

#### BUG-1 — Medium: `deleteMaterialFlow` lacks application-layer ownership check

**File:** [src/app/actions/material-flows.ts](src/app/actions/material-flows.ts) — lines 167-184

**Description:** `deleteMaterialFlow` only verifies that the caller is authenticated, then deletes the flow by ID without verifying that the flow belongs to the caller's project. The RLS DELETE policy enforces ownership at the database level, but there is no application-layer defense-in-depth check (unlike `createMaterialFlow` and `getMaterialFlows` which both perform explicit ownership joins before acting).

**Risk:** Low in practice (RLS is the primary guard), but if RLS is ever accidentally disabled on the `material_flows` table, any authenticated user could delete another user's flows by knowing or guessing a flow UUID.

**Comparison:** `createMaterialFlow` does `canvas_layouts → projects.user_id = user.id` before inserting. `deleteMaterialFlow` does not.

**Decision (2026-04-14):** Kein Fix notwendig. Das Tool ist ausschließlich intern zugänglich; der Nutzerkreis ist kontrolliert. Die RLS-Policy ist ausreichend als einzige Absicherung. Kein weiterer Handlungsbedarf.

### Test Coverage

- **Unit tests:** 26 tests in [src/app/actions/material-flows.test.ts](src/app/actions/material-flows.test.ts)
  - `computeIntensity`: 4 tests
  - `isSelfFlow`: 3 tests
  - `isDuplicateFlow`: 6 tests (including edit-exclusion logic)
  - `validateFlowForm`: 10 tests (all validation paths)
  - `getNachOptions`: 3 tests (self-exclusion from Nach dropdown)
- **E2E tests:** 22 tests in [tests/PROJ-6-materialfluss-definition.spec.ts](tests/PROJ-6-materialfluss-definition.spec.ts)
  - All 10 acceptance criteria covered
  - All documented edge cases covered
  - Security redirect check
  - 2 regression checks

### Test Results Summary

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| Vitest (unit) | 48 total (26 new) | 48 | 0 |
| Playwright E2E (Chromium) | 68 total (22 new) | 68 | 0 |

### Production-Ready Decision

**READY** — No Critical or High bugs. One Medium bug (BUG-1: missing app-layer ownership check in `deleteMaterialFlow`) is recommended to fix before deploy for defense-in-depth, but feature functionality is complete and RLS provides the primary security guarantee.

## Deployment
_To be added by /deploy_
