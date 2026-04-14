# PROJ-4: Maschinen & Anlagen Bibliothek

## Status: Architected
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
