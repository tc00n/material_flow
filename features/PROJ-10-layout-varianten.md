# PROJ-10: Layout-Varianten Vergleich

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
