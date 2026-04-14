# PROJ-5: Quellen & Senken Definition

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-3 (Layout Canvas) — Quellen und Senken werden auf dem Canvas platziert
- Requires: PROJ-4 (Maschinen Bibliothek) — Konzept der platzierbaren Objekte

## User Stories
- As a consultant, I want to define material sources (Quellen) on the canvas so that I can model where materials enter the production process.
- As a consultant, I want to define material sinks (Senken) on the canvas so that I can model where materials leave the production process.
- As a consultant, I want to give each source and sink a name so that the flow diagram is readable.
- As a consultant, I want to visually distinguish sources and sinks from machines so that the layout is immediately understandable.

## Acceptance Criteria
- [ ] In der Seitenleiste gibt es separate Kategorien: "Maschinen/Anlagen", "Quellen", "Senken"
- [ ] Quellen sind visuell klar erkennbar (z.B. grünes Dreieck oder Pfeil-nach-rechts Icon)
- [ ] Senken sind visuell klar erkennbar (z.B. rotes Dreieck oder Pfeil-nach-links Icon)
- [ ] Quellen und Senken können per Drag & Drop auf den Canvas platziert werden
- [ ] Quellen und Senken haben einen editierbaren Namen (Pflicht)
- [ ] Quellen und Senken können auf dem Canvas verschoben werden
- [ ] Quellen und Senken können gelöscht werden (mit Bestätigung wenn Materialflüsse damit verbunden sind)
- [ ] Mindestens 1 Quelle und 1 Senke müssen vorhanden sein, bevor Materialflüsse definiert werden können

## Edge Cases
- Was passiert, wenn eine Quelle gelöscht wird, die mit Materialflüssen verknüpft ist? → Bestätigungsdialog: "Diese Quelle ist mit X Flüssen verbunden. Alle verknüpften Flüsse werden ebenfalls gelöscht."
- Was passiert, wenn kein Name eingegeben wird? → Validierungsfehler, Standardname "Quelle 1" vorschlagen
- Was passiert, wenn Quelle und Senke dieselbe Position haben? → Visuelle Überlappungswarnung

## Technical Requirements
- Quellen und Senken in Supabase (Tabelle: nodes, Typ-Feld: 'source' | 'sink' | 'machine')
- Einheitliches Datenmodell für alle Canvas-Objekte (nodes)
- Icon-basierte Visualisierung (SVG-Icons)

---
## Tech Design (Solution Architect)

**Designed:** 2026-04-14

### Context
PROJ-3 established `canvas_objects` with `type: machine | source | sink`. PROJ-4 added a DB-backed machine type library. PROJ-5 completes the sidebar by making sources and sinks interactive — but unlike machines, each source/sink is a unique canvas instance (no "type library" needed).

### Component Structure

```
CanvasPage (no structural changes)
+-- MachineSidebar (refactored: Quellen & Senken tabs)
|   +-- [Maschinen Tab] — unchanged (PROJ-4 scope)
|   +-- [Quellen Tab] (new)
|   |   +-- DraggableItem: "Neue Quelle"  (drag onto canvas → creates source instance)
|   |   +-- PlacedSourceList (read-only list of sources currently on canvas)
|   |       +-- Name label + position indicator
|   +-- [Senken Tab] (new, same pattern)
|       +-- DraggableItem: "Neue Senke"
|       +-- PlacedSinkList
|
+-- MachineNode (updated: visual identity for source/sink types)
|   +-- Machine type → colored rectangle (unchanged)
|   +-- Source type → green chevron-right icon, green border (#16a34a)
|   +-- Sink type   → red chevron-left icon, red border (#dc2626)
|
+-- PropertiesPanel (updated: deletion guard)
    +-- Name input (required, default "Quelle N" / "Senke N")
    +-- DeleteButton
        +-- If no material flows: immediate delete
        +-- If flows attached (PROJ-6): AlertDialog with flow count warning
```

### Data Model

No new database tables. Reuses `canvas_objects` entirely:

**`canvas_objects`** (existing table):
- `type` = `'source'` or `'sink'` (enum already supports both values)
- `label` = user-defined name (e.g. "Wareneingang", "Senke 1")
- `pos_x`, `pos_y` = position on canvas in grid units
- `width`, `height` = fixed at 2×2 grid units (sources/sinks are always the same size)
- `machine_type_id` = always `null` (not linked to machine type library)
- `color` = always `null` (visual color comes from type, not user-defined)

**Auto-naming logic** (client-side):
- When a source is dropped: count existing sources → default name = "Quelle {N+1}"
- When a sink is dropped: count existing sinks → default name = "Senke {N+1}"
- User can rename immediately in the Properties Panel; empty name blocked with validation

### Tech Decisions

| Decision | Choice | Why |
|---|---|---|
| No new DB table | Reuse `canvas_objects` | Sources/sinks are unique instances, not typed objects with a library. Table already supports `type: source\|sink` |
| Fixed size (2×2) | Non-resizable in Properties Panel | Sources/sinks are logical entry/exit points, not physical machines with real dimensions |
| Visual identity | Lucide `ChevronRight` (green) / `ChevronLeft` (red) icons in MachineNode | No new package — `lucide-react` already installed; green (#16a34a) and red (#dc2626) match semantic meaning |
| Deletion guard | AlertDialog when material flows exist | Guard activates in PROJ-6 when `material_flows` table is added; for now always allows deletion |
| Min count validation | Enforced at flow-definition time (PROJ-6) | "At least 1 source + 1 sink" is a prerequisite for PROJ-6, not a canvas constraint |
| Sidebar inventory | Read-only list of placed sources/sinks in each tab | Consultant sees at a glance which entry/exit points are defined without scanning the canvas |

### New Dependencies
None. All required tools are already installed:
- `@xyflow/react` — handles drag & drop (unchanged)
- `lucide-react` — provides source/sink icons
- `shadcn/ui AlertDialog` — already installed, used for delete confirmation

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
