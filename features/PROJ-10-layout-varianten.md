# PROJ-10: Layout-Varianten Vergleich

## Status: In Progress
**Created:** 2026-04-14
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-3 (Layout Canvas)
- Requires: PROJ-8 (Kennzahlen-Berechnung) — Kennzahlen werden pro Variante verglichen

## User Stories
- As a consultant, I want to create multiple layout variants within one project so that I can compare different arrangements.
- As a consultant, I want to see the KPIs of all variants side by side so that I can make a data-driven recommendation to the client.
- As a consultant, I want to switch between variants so that I can show different scenarios in a client meeting.

## Acceptance Criteria
- [ ] Ein Projekt kann mehrere Layout-Varianten haben (min. 1, empfohlen: bis zu 5)
- [ ] Neue Variante kann als Kopie einer bestehenden Variante erstellt werden
- [ ] Varianten können benannt werden (z.B. "Variante A – Aktuell", "Variante B – Optimiert")
- [ ] Vergleichsansicht zeigt KPIs aller Varianten nebeneinander in einer Tabelle
- [ ] Aktive Variante ist im Canvas-Bereich klar erkennbar

## Edge Cases
- Was passiert, wenn eine Variante gelöscht wird, die die einzige ist? → Löschen blockiert
- Was passiert bei > 5 Varianten? → Warnung, aber kein hartes Limit

---
## Tech Design (Solution Architect)
**Added:** 2026-04-16

### Overview
The existing `canvas_layouts` table already supports multiple rows per project via `project_id`. We extend it with a `name` and `sort_order` column, and update the query layer to work with multiple variants instead of enforcing one-per-project.

### Database Changes
Two new columns on `canvas_layouts`:
- `name` (text, not null, default `'Variante 1'`) — user-visible variant name
- `sort_order` (integer, not null, default `1`) — controls tab order

Backfill: existing rows get `name = 'Variante 1'`, `sort_order = 1`.

No new tables needed. `canvas_objects` and `material_flows` are already scoped to `canvas_layout_id`, so they are naturally per-variant.

### Component Structure
```
Canvas Page  /projects/[id]/canvas?variant=<layout-id>
│
├── VariantBar (NEW)
│   ├── VariantTab × N  (click to switch, double-click to rename)
│   ├── [+ Neue Variante] Button
│   └── [...] Menu per tab  (Umbenennen / Duplizieren / Löschen)
│
├── CanvasHeader (extended — adds "Vergleich" tab)
│
├── CanvasClient (existing — loads objects for active variant only)
│
└── KpiComparisonPanel (NEW — shown when "Vergleich" tab active)
    └── ComparisonTable: rows = KPI metrics, columns = variants
        └── Best cell per row highlighted in green
```

### Active Variant Tracking
Active variant is tracked via URL query parameter: `?variant=<canvas_layout_id>`.
On first visit (no param), defaults to the first variant by `sort_order`.
No additional database state required.

### New Server Actions
| Action | Purpose |
|--------|---------|
| `getVariants(projectId)` | All canvas_layouts for a project, ordered by sort_order |
| `createVariant(projectId, name, copyFromId?)` | New blank or deep-copied variant |
| `renameVariant(layoutId, name)` | Updates name field |
| `deleteVariant(layoutId)` | Deletes layout + cascades; blocked if only 1 variant |
| `getVariantKpis(projectId)` | KPIs for all variants in one call (reuses existing KPI logic) |

### Copy Strategy
Copying a variant creates: (1) new `canvas_layout` row, (2) deep copy of all `canvas_objects` with new IDs, (3) deep copy of all `material_flows` with re-mapped node IDs. Done server-side for atomicity.

### Tech Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Active variant tracking | URL param (`?variant=id`) | Bookmarkable, no extra DB state |
| Variant copy | Server-side deep copy | Atomic, avoids partial copies |
| KPI comparison fetch | Single aggregated action | One round-trip for all variants |
| Comparison view | Tab in existing CanvasHeader | Reuses existing navigation pattern |

### Dependencies
None — all libraries already installed.

## Implementation Notes (Frontend)
**Implemented:** 2026-04-16

### What was built
- **DB migration**: Added `name` (text, default `'Variante 1'`) and `sort_order` (int, default `1`) columns to `canvas_layouts` table. Existing rows backfilled.
- **Server actions** (in `canvas.ts`):
  - `getVariants(projectId)` — all variants ordered by `sort_order`
  - `createVariant(projectId, name, copyFromId?)` — blank or deep-copied (objects + flows with re-mapped IDs)
  - `renameVariant(layoutId, name)` — updates name field
  - `deleteVariant(layoutId)` — blocked if only 1 variant remains
  - `getVariantKpis(projectId)` — server-side KPI aggregation across all variants
- **`VariantBar`** (`src/components/canvas/variant-bar.tsx`): Tab bar below the header, shows one tab per variant. Click to switch (navigates to `?variant=<id>`). Double-click or dropdown "Umbenennen" to rename inline. Dropdown also offers "Duplizieren" and "Löschen". `[+]` button adds a blank new variant.
- **`KpiComparisonPanel`** (`src/components/canvas/kpi-comparison-panel.tsx`): Full-width table with KPIs as rows (distance, cost, transports, stations, flows) and variants as columns. Best value per row highlighted in green. Refresh button re-fetches from server.
- **`CanvasHeader`**: Added "Vergleich" tab alongside "Layout" and "Materialfluss".
- **`CanvasClient`**: Accepts `variants: CanvasLayout[]` prop; renders `VariantBar` between header and body; routes to `?variant=<id>` on tab click; shows `KpiComparisonPanel` when "Vergleich" tab is active.
- **Canvas Page**: Reads `?variant` search param; loads all variants in parallel with active canvas data; passes both to `CanvasClient`.

### Deviations from Tech Design
- None material. Followed the design exactly.

## QA Test Results
**QA Date:** 2026-04-16
**Tester:** /qa skill
**Status:** In Review

### Automated Tests
| Suite | Result |
|-------|--------|
| Unit tests (`npm test`) | ✅ 125/125 passed (14 new for PROJ-10) |
| E2E tests (`npm run test:e2e`) | ✅ 245/246 passed (26 new for PROJ-10; 1 pre-existing PROJ-1 failure unrelated) |

### Acceptance Criteria

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC1 | Ein Projekt kann mehrere Layout-Varianten haben (min. 1, empfohlen: bis zu 5) | ✅ PASS | `createVariant` supports unlimited variants; VariantBar renders tab per variant |
| AC2 | Neue Variante kann als Kopie einer bestehenden Variante erstellt werden | ✅ PASS | Deep copy of objects + flows with re-mapped IDs implemented server-side in `createVariant` |
| AC3 | Varianten können benannt werden | ✅ PASS | Inline rename via double-click or dropdown "Umbenennen"; `renameVariant` action updates DB |
| AC4 | Vergleichsansicht zeigt KPIs aller Varianten nebeneinander in einer Tabelle | ✅ PASS | `KpiComparisonPanel` shows 5 KPI rows × N variant columns; best cell highlighted green |
| AC5 | Aktive Variante ist im Canvas-Bereich klar erkennbar | ✅ PASS | Active tab: `bg-background border border-border shadow-sm font-medium`; inactive: muted text |

### Edge Cases

| Case | Result | Notes |
|------|--------|-------|
| Letzte Variante kann nicht gelöscht werden | ✅ PASS | `deleteVariant` returns error "Letzte Variante kann nicht gelöscht werden" when `count ≤ 1`; delete button disabled in UI |
| > 5 Varianten: Warnung | ❌ FAIL | **BUG-2** — No warning displayed when adding a 6th variant; spec requires a warning but no hard limit |

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| Unauthenticated access to canvas | ✅ PASS | Redirects to `/login` |
| `deleteVariant` ownership check | ✅ PASS | Joins `projects!inner(user_id)` to verify caller owns the layout |
| `renameVariant` app-layer ownership | ⚠️ LOW | No explicit ownership join; relies on RLS. Consistent with established project pattern (see PROJ-6 `deleteMaterialFlow`). Accepted: tool is internal-only. |
| `createVariant` app-layer projectId ownership | ⚠️ LOW | No ownership join for `projectId`; relies on RLS. Same accepted pattern. |
| `getVariantKpis` app-layer check | ⚠️ LOW | Auth check only; RLS is primary guard. Same accepted pattern. |

### Bugs Found

#### BUG-1 — Double server call on Enter+blur in inline rename
**Severity:** Medium
**Location:** [variant-bar.tsx:36-51](src/components/canvas/variant-bar.tsx#L36-L51)
**Steps to reproduce:**
1. Double-click a variant tab to open inline rename
2. Type a new name
3. Press Enter

**Expected:** `renameVariant` called once.
**Actual:** `renameVariant` called twice — `onKeyDown` calls `commitRename`, then `onBlur` fires before the async transition completes and React state updates `editingId`, calling `commitRename` a second time.
**Fix:** Use a ref to guard against the second call, e.g. `if (isCommittingRef.current) return; isCommittingRef.current = true`.

---

#### BUG-2 — Missing >5 variants warning
**Severity:** Medium
**Location:** [variant-bar.tsx:53-65](src/components/canvas/variant-bar.tsx#L53-L65) — `handleAddVariant`
**Steps to reproduce:**
1. Create 5 variants
2. Click "+" to add a 6th

**Expected:** A warning is shown (e.g. "Mehr als 5 Varianten können die Übersichtlichkeit beeinträchtigen") while still allowing creation.
**Actual:** Variant is created silently with no warning.
**Fix:** In `handleAddVariant`, check `variants.length >= 5` before creating and set `error` state with a warning message.

---

#### BUG-3 — No unsaved-changes guard when switching variants
**Severity:** Medium
**Location:** [canvas-client.tsx:393-395](src/components/canvas/canvas-client.tsx#L393-L395) — `handleVariantChange`
**Steps to reproduce:**
1. Move a node on the canvas (save status → "Nicht gespeichert")
2. Click a different variant tab within 2 seconds (before debounce fires)

**Expected:** Immediate save is triggered before navigation, OR user is warned about unsaved changes.
**Actual:** `router.push()` navigates immediately. The debounced save never fires for the old variant because the component unmounts.
**Fix:** In `handleVariantChange`, call `performSave(nodes)` directly (bypassing the debounce) before `router.push(...)`, or check `saveStatus === 'unsaved'` and await the save first.

---

#### BUG-4 — Context menu only accessible on active variant tab
**Severity:** Low
**Location:** [variant-bar.tsx:133-165](src/components/canvas/variant-bar.tsx#L133-L165)
**Description:** The `[...]` dropdown (Umbenennen / Duplizieren / Löschen) is only rendered for the currently active tab. To delete or duplicate an inactive variant, the user must first switch to it. This is a minor ergonomic issue.
**Fix:** Render the dropdown on all tabs, or show it on hover for inactive tabs too.

### Regression Testing

| Feature | Result |
|---------|--------|
| PROJ-1: Login / Logout | ✅ No regression |
| PROJ-2: Projekt-Dashboard | ✅ No regression |
| PROJ-3: Layout Canvas (drag & drop, save) | ✅ No regression |
| PROJ-8: KPI Panel | ✅ No regression |
| PROJ-9: Auto-Layout-Optimierung | ✅ No regression |

### Production-Ready Decision
**NOT READY** — BUG-3 (Medium: data loss risk on variant switch) should be fixed before deployment. BUG-1 and BUG-2 are also Medium severity.

Minimum bar for Approved: fix BUG-3 (data loss). BUG-1 and BUG-2 are recommended fixes before deploy.

## Deployment
_To be added by /deploy_
