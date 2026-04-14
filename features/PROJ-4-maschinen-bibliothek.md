# PROJ-4: Maschinen & Anlagen Bibliothek

## Status: Deployed
**Created:** 2026-04-14
**Last Updated:** 2026-04-14
**Deployed:** 2026-04-14
**Tag:** v1.4.0-PROJ-4

## Dependencies
- Requires: PROJ-3 (Layout Canvas) — Objekte werden aus der Bibliothek auf den Canvas gezogen

## User Stories
- As a consultant, I want to create custom machine/station types with a name, size, and color so that I can represent the real factory equipment.
- As a consultant, I want to see a list of all available machine types in a sidebar so that I can quickly find and place them.
- As a consultant, I want to edit an existing machine type so that I can correct mistakes.
- As a consultant, I want to delete a machine type from the library so that I can keep it clean.
- As a consultant, I want placed instances to update visually when I change the type so that my layout stays consistent.

## Acceptance Criteria
- [ ] Seitenleiste zeigt alle definierten Maschinen-/Anlagentypen des Projekts
- [ ] Neuen Typ erstellen: Name (Pflicht), Breite x Tiefe in Metern (Pflicht), Farbe (Pflicht), Beschreibung (optional)
- [ ] Jeder Typ wird als farbiges, beschriftetes Rechteck dargestellt
- [ ] Drag & Drop aus Bibliothek auf Canvas platziert eine Instanz des Typs
- [ ] Mehrere Instanzen desselben Typs können platziert werden
- [ ] Typ bearbeiten: Alle Felder änderbar, Änderungen aktualisieren alle platzierten Instanzen
- [ ] Typ löschen: Nur möglich wenn keine Instanzen auf dem Canvas platziert sind — sonst Fehlermeldung
- [ ] Bibliothek-Einträge sind alphabetisch sortiert

## Edge Cases
- Was passiert, wenn ein Typname bereits existiert? → Validierungsfehler ("Name bereits vergeben")
- Was passiert, wenn Breite oder Tiefe 0 eingegeben wird? → Validierungsfehler (Mindestgröße: 0.5m x 0.5m)
- Was passiert, wenn ein Typ mit platzierten Instanzen gelöscht werden soll? → Blockiert mit Meldung, wie viele Instanzen betroffen sind
- Was passiert bei sehr vielen Typen (> 30)? → Suchfeld in der Seitenleiste

## Technical Requirements
- Typen in Supabase (Tabelle: machine_types, verknüpft mit project_id)
- Instanzen auf Canvas referenzieren den Typ (Foreign Key)
- Farbauswahl: Vordefinierte Palette (10-15 Farben) oder Custom Hex-Input

---
## Tech Design (Solution Architect)

**Designed:** 2026-04-14

### Context
PROJ-3 canvas stores objects in `canvas_objects` with hardcoded sidebar items. PROJ-4 replaces the static machine list with user-defined, database-backed types per project.

### Component Structure
```
CanvasPage (server component)
+-- Fetches machine_types for project alongside canvas data
+-- CanvasClient (client)
    +-- MachineSidebar (refactored: static → dynamic)
    |   +-- Tabs: Maschinen | Quellen | Senken
    |   +-- [Maschinen Tab]
    |       +-- "+" Add Type Button → CreateTypeDialog
    |       +-- SearchInput (visible only when > 30 types)
    |       +-- DraggableItem (per user-defined type, alphabetically sorted)
    |           +-- Edit icon → EditTypeDialog
    |           +-- Delete icon (blocked if instances on canvas)
    +-- CreateTypeDialog (new shadcn Dialog)
    |   +-- Name input (required, unique per project)
    |   +-- Width × Height inputs in meters (min 0.5m)
    |   +-- ColorPicker (12 preset swatches + custom hex input)
    |   +-- Description textarea (optional)
    +-- EditTypeDialog (same form, pre-filled)
    +-- MachineNode (updated: reads from machine_type for display)
    +-- Canvas, PropertiesPanel (unchanged)
```

### Data Model

**New table: `machine_types`**
- `id` UUID PK
- `project_id` UUID FK → projects
- `name` text, required, unique per project (max 100 chars)
- `width_m` float, min 0.5
- `height_m` float, min 0.5
- `color` text (hex string, e.g. "#003C73")
- `description` text, optional
- `created_at` timestamp

**Modified table: `canvas_objects`**
- Add `machine_type_id` UUID nullable FK → machine_types
- Null for sources, sinks, and legacy objects
- When type is updated, canvas nodes re-render from type data (no duplication)

### Tech Decisions
| Decision | Choice | Why |
|---|---|---|
| Type storage | Supabase `machine_types` table | Types belong to a project, must persist |
| Canvas object link | `machine_type_id` nullable FK | Live sync when type is edited; sources/sinks remain null |
| Delete guard | Server-side count check | Spec: show how many instances are affected |
| Color picker | 12 preset swatches + hex input | No extra package; covers 90% of cases |
| Search | Shown only when count > 30 | Avoids UI clutter for typical small projects |
| Quellen/Senken | Hardcoded, unchanged | PROJ-5 scope |

### New Server Actions (`src/app/actions/machine-types.ts`)
- `getMachineTypes(projectId)` — fetch all, ordered by name
- `createMachineType(projectId, data)` — create, enforce unique name per project
- `updateMachineType(id, data)` — update with ownership check + name uniqueness
- `deleteMachineType(id)` — count canvas instances first; return error if any exist

### Database Migration
1. Create `machine_types` table with RLS (access = project owner only)
2. Add `machine_type_id` nullable column to `canvas_objects`

### Dependencies
No new packages needed — Dialog, Input, Label, Button, Textarea already installed.

## Implementation Notes (Frontend)

**Built 2026-04-14**

### New files
- `src/app/actions/machine-types.ts` — server actions: `getMachineTypes`, `createMachineType`, `updateMachineType`, `deleteMachineType`
- `src/components/canvas/machine-type-dialog.tsx` — shared create/edit dialog with 12 preset color swatches + custom hex input and live preview

### Modified files
- `src/app/actions/canvas.ts` — added `machine_type_id: string | null` to `CanvasObject`
- `src/components/canvas/machine-node.tsx` — added `machine_type_id?: string` to `MachineNodeData`
- `src/components/canvas/machine-sidebar.tsx` — full rewrite: static machine list → dynamic types from DB, with create/edit/delete per-type, search (shown only when >30 types), alphabetical sort; sources/sinks remain hardcoded (PROJ-5 scope)
- `src/components/canvas/canvas-client.tsx` — accepts `initialMachineTypes`, passes to sidebar; `handleTypeUpdated` syncs all canvas nodes linked to edited type; `machine_type_id` persisted in save payload
- `src/app/(protected)/projects/[id]/canvas/page.tsx` — fetches `getMachineTypes(projectId)` and passes to `CanvasClient`

### Deviations from spec
- None. Delete guard (check for instances) is implemented in the server action; the sidebar shows the error inline.

## Implementation Notes (Backend)

**Built 2026-04-14**

### Database Migration: `create_machine_types_table`
- Created `machine_types` table with columns: `id`, `project_id`, `name`, `width_m`, `height_m`, `color`, `description`, `created_at`
- Constraints: `UNIQUE(project_id, name)`, `CHECK width_m >= 0.5`, `CHECK height_m >= 0.5`, `CHECK name length 1–100`
- FK: `project_id → projects(id) ON DELETE CASCADE`
- RLS enabled with 4 policies (SELECT/INSERT/UPDATE/DELETE) — all scoped to project owner via `auth.uid()`
- Index: `idx_machine_types_project_id` on `(project_id, name)` for fast alphabetical lookups
- Added `machine_type_id UUID NULLABLE` to `canvas_objects` with FK → `machine_types(id) ON DELETE SET NULL`
- Partial index: `idx_canvas_objects_machine_type_id WHERE machine_type_id IS NOT NULL`

### Server Actions (already written by frontend skill)
- `src/app/actions/machine-types.ts` — all 4 actions verified correct; no changes needed

### Deviations
- None.

## QA Test Results

**QA Date:** 2026-04-14
**Tester:** /qa skill
**Status: APPROVED — No Critical or High bugs found**

### Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| AC-1 | Sidebar shows all defined machine/system types for the project | PASS |
| AC-2 | Create type: Name (required), Width × Height in meters (required), Color (required), Description (optional) | PASS |
| AC-3 | Each type rendered as a colored, labeled rectangle | PASS |
| AC-4 | Drag & drop from library onto canvas places an instance of the type | PASS (code review) |
| AC-5 | Multiple instances of the same type can be placed | PASS (code review) |
| AC-6 | Edit type: all fields editable, changes update all placed instances | PASS (code review + `handleTypeUpdated` logic verified) |
| AC-7 | Delete type: blocked with error message if instances exist on canvas | PASS (code review + server action logic verified) |
| AC-8 | Library entries sorted alphabetically | PASS (server `.order('name')` + client-side sort after mutations) |

### Edge Cases

| Case | Result |
|------|--------|
| Duplicate type name → validation error "Name bereits vergeben" | PASS — server uses `ilike` (case-insensitive) |
| Width or height < 0.5 → validation error | PASS — client validates + DB CHECK constraint enforces it |
| Delete type with instances → blocked, message shows count | PASS — `deleteMachineType` counts instances before deletion |
| > 30 types → search field appears | PASS — `showSearch = machineTypes.length > 30` |

### Security Audit

| Check | Result |
|-------|--------|
| Unauthenticated access to canvas (and library) blocked | PASS — server redirects to /login |
| `createMachineType` verifies project ownership | PASS — joins to `projects` table with `user_id = auth.uid()` |
| `updateMachineType` verifies ownership | PASS — join check on `projects.user_id` |
| `deleteMachineType` verifies ownership | PASS — join check on `projects.user_id` |
| Cross-project data access (RLS) | PASS — RLS policies scope SELECT/INSERT/UPDATE/DELETE to project owner |
| Name input injection | PASS — `.trim()` applied; Supabase parameterized queries prevent SQL injection |
| Unique name check is case-insensitive | PASS — `ilike` used on both create and update |

### Bugs Found

| ID | Severity | Description | Steps to Reproduce |
|----|----------|-------------|-------------------|
| BUG-4-1 | Low | Stale delete error persists after creating a new type | 1. Try to delete a type that has canvas instances → error appears. 2. Click "Neuer Typ" and create a new type → delete error message remains visible in sidebar. |

### Test Suite

- **Unit tests (Vitest):** 22 passed (no new tests needed — no extractable pure logic in this feature)
- **E2E tests (Playwright):** 20 new tests added in `tests/PROJ-4-maschinen-bibliothek.spec.ts`
  - Security: canvas route blocks unauthenticated access
  - Sidebar tab structure (Maschinen / Quellen / Senken)
  - Create dialog: all required fields present, validation messages, preview
  - Color picker: 12 preset swatches, custom hex input (maxlength=7)
  - Machine type item: color swatch, name, dimensions, edit/delete buttons
  - Delete guard: singular/plural error message
  - Alphabetical sort rendering
  - Search filter behavior
  - Empty state message
  - Two regression tests for prior features
- **Total E2E suite:** 45 passed

### Production-Ready Decision: YES

No Critical or High bugs. BUG-4-1 (Low) is a cosmetic UX issue that does not block any acceptance criterion.

## Deployment
_To be added by /deploy_
