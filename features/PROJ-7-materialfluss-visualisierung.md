# PROJ-7: Materialfluss-Visualisierung (Spaghetti-Diagramm)

## Status: Approved
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-3 (Layout Canvas) — Visualisierung überlagert den Canvas
- Requires: PROJ-6 (Materialfluss-Definition) — Flüsse müssen definiert sein

## User Stories
- As a consultant, I want to see the material flows as lines on the factory layout so that I can visually identify long transport routes and crossing flows.
- As a consultant, I want the line thickness to represent the transport intensity (quantity × frequency) so that high-volume flows are immediately visible.
- As a consultant, I want the line color to represent the intensity level (e.g. green = low, orange = medium, red = high) so that problem areas are obvious at a glance.
- As a consultant, I want to toggle the flow visualization on/off so that I can compare the layout with and without flow overlay.
- As a consultant, I want to hover over a flow line to see the details (from, to, quantity, frequency) so that I can read the exact values.

## Acceptance Criteria
- [ ] Materialflüsse werden als Linien über dem Layout-Canvas eingeblendet
- [ ] Liniendicke skaliert proportional zur Transportintensität (quantity × frequency): dünn = wenig, dick = viel
- [ ] Linienfarbe zeigt Intensitätsstufe: grün (< 33%), orange (33–66%), rot (> 66% des Max)
- [ ] Hover über eine Linie zeigt Tooltip: "Von: [Name] → Nach: [Name] | [Menge] Einheiten × [Freq.]/Tag"
- [ ] Toggle-Button: "Materialfluss anzeigen / ausblenden"
- [ ] Wenn keine Flüsse definiert sind: Hinweis statt leerer Canvas
- [ ] Linien verbinden die Mittelpunkte der Canvas-Objekte
- [ ] Bei Überlagerung mehrerer Flüsse zwischen denselben Punkten werden die Linien leicht versetzt dargestellt

## Edge Cases
- Was passiert, wenn ein Fluss auf ein nicht mehr vorhandenes Canvas-Objekt zeigt? → Fluss wird ignoriert, kein Crash
- Was passiert bei sehr vielen Flüssen (> 50)? → Alle werden dargestellt; bei Performance-Problemen werden Linien vereinfacht
- Was passiert wenn alle Flüsse dieselbe Intensität haben? → Alle Linien haben gleiche Dicke und Farbe (grün)
- Was passiert, wenn ein Objekt bewegt wird während die Visualisierung aktiv ist? → Linien aktualisieren sich live

## Technical Requirements
- Visualisierung als SVG-Overlay über dem Canvas
- Liniendicke: min 2px, max 12px, linear skaliert
- Performance: Neuberechnung der Linien bei Objekt-Bewegung < 50ms (requestAnimationFrame)
- Farbskala: Grün (#22c55e) → Orange (#f97316) → Rot (#ef4444)

---
## Tech Design (Solution Architect)

**Designed:** 2026-04-14

### Overview
Pure frontend feature — no new backend, no database schema changes. All required data already exists from PROJ-3 (node positions) and PROJ-6 (material flows). The feature adds an SVG overlay on top of the existing ReactFlow canvas.

### Component Structure
```
CanvasFlow (canvas-client.tsx) — modified
├── CanvasHeader — modified (toggle button)
├── MachineSidebar — unchanged
├── ReactFlow canvas
│   └── Background, MachineNodes — unchanged
├── SpaghettiOverlay (NEW: spaghetti-overlay.tsx)
│   ├── <svg> absolutely positioned, pointer-events passthrough
│   ├── <line> per material flow (colored, width-scaled)
│   └── shadcn Tooltip on hover
└── PropertiesPanel — unchanged
```

### New Components
- **`SpaghettiOverlay`** (`src/components/canvas/spaghetti-overlay.tsx`) — pure render component. Receives `nodes`, `flows`, and `viewport` ({x, y, zoom}). Draws SVG lines between node centers using the ReactFlow viewport transform to align with the canvas.
- **Toggle button** — added inside the canvas area (top-right corner). Eye icon + label. Activates/deactivates the overlay; triggers flow fetch on first activation.

### Modifications to Existing Files
- **`canvas-client.tsx`**: Add `showSpaghetti` and `flows` state. Fetch via `getMaterialFlows` when toggle turns on. Re-fetch when returning from Materialfluss tab with overlay active. Pass data to `SpaghettiOverlay`.
- No changes to `CanvasHeader`, `CanvasTab`, or backend.

### Visual Logic
- **Coordinates**: Node center = `position.x + (widthUnits * CELL_SIZE) / 2`. Screen coord = `centerX * zoom + viewport.x`.
- **Line thickness**: Scaled linearly between 2px (min) and 12px (max) based on flow's % of max intensity.
- **Color**: `#22c55e` green (< 33%), `#f97316` orange (33–66%), `#ef4444` red (> 66% of max).
- **Parallel offsets**: Flows sharing the same node pair are offset ±6px perpendicular to the line direction.
- **Tooltip**: shadcn/ui `Tooltip` on SVG line hover — "Von: [Name] → Nach: [Name] | [Menge] Einheiten × [Freq.]/Tag".
- **Empty state**: Info banner if overlay is active but no flows defined.
- **Live updates**: Automatic — lines derive from `nodes` state + `useViewport()`, both update on drag/pan/zoom.

### Data Sources
- Node positions: `nodes` state in `CanvasFlow` (already in memory)
- Material flows: existing `getMaterialFlows(layoutId)` server action — no new API needed

### Dependencies
No new packages required:
- `@xyflow/react` — `useViewport()` hook (already used)
- `shadcn/ui Tooltip` — already installed
- `lucide-react` — `Eye`/`EyeOff` icons (already available)

## QA Test Results

**QA Date:** 2026-04-14
**QA Engineer:** /qa skill
**Test suites:** 22 unit tests (Vitest) + 32 E2E tests (Playwright, Chromium + Mobile Safari)

### Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| AC-1 | Materialflüsse werden als Linien über dem Layout-Canvas eingeblendet | ✅ Pass |
| AC-2 | Liniendicke skaliert proportional zur Transportintensität (2px–12px) | ✅ Pass |
| AC-3 | Linienfarbe: grün < 33%, orange 33–66%, rot > 66% | ✅ Pass |
| AC-4 | Hover zeigt Tooltip: "Von: X → Nach: Y \| Menge Einheiten × Freq./Tag" | ✅ Pass |
| AC-5 | Toggle-Button "Materialfluss anzeigen / ausblenden" mit Eye/EyeOff-Icon | ✅ Pass |
| AC-6 | Keine Flüsse definiert → Hinweisbanner statt leerer Canvas | ✅ Pass |
| AC-7 | Linien verbinden Mittelpunkte der Canvas-Objekte | ✅ Pass |
| AC-8 | Mehrere Flüsse zwischen selben Punkten werden versetzt dargestellt | ✅ Pass |

**All 8 acceptance criteria: 8 passed, 0 failed**

### Edge Cases

| Edge Case | Result |
|-----------|--------|
| Fluss zeigt auf nicht mehr vorhandenes Canvas-Objekt → ignoriert, kein Crash | ✅ Pass (validFlows filter) |
| > 50 Flüsse → alle dargestellt | ✅ Pass (no upper limit) |
| Alle Flüsse dieselbe Intensität → gleiche Dicke und Farbe (grün) | ❌ Fail — **Bug #1** |
| Objekt wird bewegt während Visualisierung aktiv → Linien aktualisieren sich live | ✅ Pass (derives from `nodes` state) |

### Bugs Found

#### Bug #1 — Medium: Gleiche Intensität zeigt Rot statt Grün
- **Severity:** Medium
- **Spec says:** "Alle Linien haben gleiche Dicke und Farbe (grün)" wenn alle Flüsse dieselbe Intensität haben
- **Actual behavior:** Wenn alle Flüsse identische Intensität haben, ist pct = intensity / maxIntensity = 1.0 → Farbe #ef4444 (rot)
- **Location:** [spaghetti-overlay.tsx:10-16](src/components/canvas/spaghetti-overlay.tsx#L10-L16) — `getLineColor`
- **Steps to reproduce:** Define 3 flows all with quantity×frequency = 200. Toggle spaghetti on. All lines appear red.
- **Expected:** All lines appear green (since no flow is "worse" than another in relative terms)
- **Fix needed:** Handle the all-same-intensity case — e.g., if `maxIntensity === minIntensity`, return green for all flows
- **Documented in unit test:** `spaghetti-overlay.test.ts` — "BUG: all-same-intensity flows show as RED"

### Security Audit
- `getMaterialFlows` verifies ownership: layout → project → user_id ✅
- Toggle button only visible inside authenticated canvas page ✅
- Flow data returned only for authenticated user's own layouts ✅
- No secrets exposed in SVG/tooltip output ✅

### Regression
- PROJ-1 Mobile Safari: "Login form shows error on invalid credentials" — **pre-existing failure, unrelated to PROJ-7**
- All other existing tests (167/168) pass ✅
- PROJ-3 canvas drag/drop unaffected ✅
- PROJ-6 material flow CRUD unaffected ✅

### Test Files Added
- `src/components/canvas/spaghetti-overlay.test.ts` — 22 unit tests (getLineColor, getLineWidth, parallel offset)
- `tests/PROJ-7-materialfluss-visualisierung.spec.ts` — 32 E2E tests (Chromium + Mobile Safari)

### Production-Ready Decision
**READY** — No Critical or High bugs. One Medium bug (same-intensity color) exists but does not block core functionality. Feature can ship; bug should be addressed in a follow-up fix.

## Deployment
_To be added by /deploy_
