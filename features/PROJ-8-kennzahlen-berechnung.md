# PROJ-8: Kennzahlen-Berechnung

## Status: Architected
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-6 (Materialfluss-Definition) — Flüsse sind die Datenbasis
- Requires: PROJ-3 (Layout Canvas) — Positionen der Objekte werden für Distanzberechnung benötigt

## User Stories
- As a consultant, I want to see the total transport distance per day so that I can quantify the inefficiency of the current layout.
- As a consultant, I want to see the transport cost per day (based on a cost-per-meter rate) so that I can give the client a monetary figure for optimization potential.
- As a consultant, I want to see which flow has the highest transport intensity so that I know where to focus optimization efforts.
- As a consultant, I want the KPIs to update automatically when I move a machine so that I can see the impact of layout changes in real-time.

## Acceptance Criteria
- [ ] KPI-Panel zeigt mindestens folgende Kennzahlen:
  - Gesamttransportdistanz pro Tag [Meter/Tag]
  - Gesamttransportkosten pro Tag [€/Tag] (konfigurierbare Kostensatz-Einstellung, Standard: 0,50 €/Meter)
  - Anzahl Transporte pro Tag [Transporte/Tag]
  - Top 3 Flüsse nach Intensität (Von → Nach | Intensität)
- [ ] KPIs werden automatisch neu berechnet wenn:
  - Ein Objekt verschoben wird
  - Ein Fluss hinzugefügt/bearbeitet/gelöscht wird
- [ ] Distanzberechnung nutzt euklidische Distanz zwischen Mittelpunkten der Objekte (in Metern, basierend auf Rastergröße)
- [ ] Kostensatz pro Meter ist im Projekt konfigurierbar
- [ ] KPI-Panel kann eingeklappt/ausgeklappt werden

## Edge Cases
- Was passiert, wenn keine Flüsse definiert sind? → KPI-Panel zeigt "Keine Daten — bitte Materialflüsse definieren"
- Was passiert, wenn zwei Objekte direkt übereinander liegen (Distanz = 0)? → Distanz wird als 0 angezeigt, kein Crash
- Was passiert, wenn der Kostensatz auf 0 gesetzt wird? → Transportkosten = 0 €/Tag, kein Fehler

## Technical Requirements
- Berechnung erfolgt client-seitig (JavaScript) für Echtzeit-Updates ohne Server-Roundtrip
- Distanz in Meter = Pixel-Distanz × (Rastergröße in Meter / Rastergröße in Pixel)
- Berechnung wird bei Objekt-Bewegung mit Debounce (100ms) ausgelöst

---
## Tech Design (Solution Architect)

### Overview
All KPI calculation runs client-side in the browser — no server round-trips during interactions. Node positions and flow data already present in the canvas state are used to compute metrics locally. Two new settings (cost rate, real-world scale) are persisted to the database.

### Component Structure
```
Canvas Page
+-- CanvasHeader  [Canvas | Materialflüsse tabs]
+-- [Canvas Tab]
|   +-- MachineSidebar  (left, existing)
|   +-- Canvas Area     (center, existing)
|   +-- KPI Panel       (right, collapsible)  ← NEW
|       +-- Panel Header ("Kennzahlen" + collapse toggle)
|       +-- KPI Cards
|       |   +-- Total Distance  [m / Tag]
|       |   +-- Total Cost      [€ / Tag]
|       |   +-- Transports      [/ Tag]
|       +-- Top-3 Flows Table   [Von → Nach | Intensität]
|       +-- Settings Section    [cost_per_meter | meters_per_cell]
+-- Properties Panel  (right, shown on node select, existing)
+-- [Materialflüsse Tab]
    +-- MaterialFlowPanel  (existing)
```
> KPI Panel and Properties Panel share the right side. Properties Panel takes priority when a node is selected.

### Data Model Changes
**`canvas_layouts`** — 2 new columns (no new tables):

| Field | Type | Default | Purpose |
|---|---|---|---|
| `cost_per_meter` | Decimal | `0.50` | €-cost per meter of transport |
| `meters_per_cell` | Decimal | `1.0` | Real-world meters per grid cell |

### Data Flow
```
Supabase DB
  canvas_layouts  (incl. cost_per_meter, meters_per_cell)
  canvas_objects  (positions + dimensions)
  material_flows  (flows + transport_intensity)
        ↓  loaded once on canvas open
  CanvasFlow state
    nodes[]  — positions update live on drag
    flows[]  — reloaded on flow create/edit/delete
    layout   — incl. the two new settings
        ↓  100ms debounce on node moves
  useKpiCalculation hook  (pure browser math)
    totalDistance   = Σ (flow.intensity × euclidean_dist(from_center, to_center))
    totalCost       = totalDistance × cost_per_meter
    totalTransports = Σ flow.frequency
    top3Flows       = flows sorted by intensity, top 3
        ↓
  KpiPanel  (display only)
```
Distance formula: `dist_m = sqrt(Δx² + Δy²) × meters_per_cell` (grid-unit coordinates of node centres)

### New Files
| File | Purpose |
|---|---|
| `src/components/canvas/kpi-panel.tsx` | Collapsible KPI panel UI |
| `src/hooks/use-kpi-calculation.ts` | Pure hook — computes KPIs with 100ms debounce |

### Existing Files to Modify
| File | Change |
|---|---|
| `src/components/canvas/canvas-client.tsx` | Always load flows (not only when spaghetti is on); pass settings + flows to KpiPanel |
| `src/app/actions/canvas.ts` | Add `cost_per_meter` + `meters_per_cell` to `CanvasLayout` type; read/write them |
| Supabase migration | Add two columns to `canvas_layouts` |

### Tech Decisions
- **Client-side calculation** — node drag events fire many times/sec; server calls would be too slow. All needed data is already in browser state.
- **100ms debounce** — prevents recalculating on every drag pixel; computes once per "settle".
- **Settings in `canvas_layouts`** — persists cost rate and scale factor per project across sessions; no new table needed.
- **No new API route** — a small `updateLayoutSettings` server action covers settings persistence.
- **Unified flow loading** — flows loaded once on canvas open, shared between spaghetti overlay and KPI panel.

### Dependencies
No new npm packages. Uses existing: shadcn/ui (`Collapsible`, `Card`, `Badge`, `Table`, `Input`), Lucide icons.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
