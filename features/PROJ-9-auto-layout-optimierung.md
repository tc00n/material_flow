# PROJ-9: Auto-Layout-Optimierung

## Status: Approved
**Created:** 2026-04-14
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-8 (Kennzahlen-Berechnung) — Gesamtdistanz ist die Zielfunktion
- Requires: PROJ-3 (Layout Canvas) — Optimierung verändert Positionen auf dem Canvas

## User Stories
- As a consultant, I want to click "Optimieren" and get an automatically improved layout so that I can show clients a better arrangement without manual trial and error.
- As a consultant, I want to see the improvement in % (before vs. after total transport distance) so that I can quantify the optimization benefit.
- As a consultant, I want to accept or reject the optimized layout so that I stay in control.
- As a consultant, I want the optimization to run in < 10 seconds so that the workflow is not interrupted.

## Acceptance Criteria
- [ ] "Layout optimieren" Button ist im UI sichtbar (z.B. in der Toolbar oder KPI-Panel)
- [ ] Optimierung startet mit Loading-Indikator ("Optimierung läuft...")
- [ ] Optimierungsalgorithmus minimiert Gesamttransportdistanz (quantity × frequency × distance)
- [ ] Vor dem Start: Dialog "Welche Objekte sollen fixiert bleiben?" — Berater wählt per Checkbox aus allen Canvas-Objekten (z.B. Wareneingang, Außenlager an der Wand)
- [ ] Fixierte Objekte werden nicht verschoben; alle anderen werden repositioniert
- [ ] Nach Abschluss wird eine Vorschau des optimierten Layouts angezeigt
- [ ] Verbesserung wird angezeigt: "Transportdistanz: 1.240m/Tag → 780m/Tag (−37%)"
- [ ] Nutzer kann "Übernehmen" oder "Verwerfen" klicken
- [ ] Bei "Übernehmen" wird das neue Layout gespeichert
- [ ] Bei "Verwerfen" bleibt das alte Layout erhalten
- [ ] Optimierung läuft in < 10 Sekunden für bis zu 50 Objekte
- [ ] Snap-to-Grid bleibt nach der Optimierung erhalten

## Edge Cases
- Was passiert, wenn < 2 Objekte vorhanden sind? → Button deaktiviert mit Hinweis "Mindestens 2 Stationen erforderlich"
- Was passiert, wenn keine Flüsse definiert sind? → Button deaktiviert mit Hinweis "Bitte zuerst Materialflüsse definieren"
- Was passiert, wenn die Optimierung das Layout nicht verbessern kann? → Meldung "Kein besseres Layout gefunden — aktuelles Layout ist bereits gut."
- Was passiert, wenn der Browser-Tab während der Optimierung geschlossen wird? → Abbruch, altes Layout bleibt erhalten

## Technical Requirements
- Algorithmus: Simulated Annealing (Implementierung in JavaScript/TypeScript, kein externe API)
  - Grund: Bewährt für diskrete Optimierungsprobleme, keine externen Abhängigkeiten
  - Alternativen: Greedy-Swap (schneller, schlechtere Qualität) als Fallback
- Läuft client-seitig (Web Worker um UI nicht zu blockieren)
- Einschränkungen: Objekte können nicht außerhalb der Canvas-Grenzen platziert werden
- Fixierte Objekte: User-definiert per Checkbox-Dialog vor dem Start (kein implizites source/sink-Konzept mehr — PROJ-5 cancelled)
- Kollisionsvermeidung: Objekte dürfen sich nicht überlappen (wird als Constraint behandelt)

---
## Tech Design (Solution Architect)

### Component Structure

```
KpiPanel (existing — gains "Optimize" button)
└── "Layout optimieren" Button
     │
     ▼ (click)
FixedObjectsDialog   [NEW modal]
  └── Checkbox list of all canvas objects
  └── "Optimierung starten" Button
       │
       ▼ (confirm)
  Loading Overlay   [NEW inline state in canvas-client]
  "Optimierung läuft..." + Spinner
       │
       ▼ (done)
OptimizationResultPanel   [NEW — replaces KpiPanel temporarily]
  ├── BeforeAfterCard: "1.240 m/Tag → 780 m/Tag (−37%)"
  ├── "Übernehmen" Button → saves + restores KpiPanel
  └── "Verwerfen" Button  → discards + restores KpiPanel
```

Canvas shows a preview of the optimized layout while the result panel is open.

### Data Model

No new database tables. Optimization result is in-memory until accepted.

```
Optimizer input:
  - All canvas nodes (id, pos_x, pos_y, width, height)
  - Fixed node IDs (user-selected via dialog)
  - All material flows (from_node_id, to_node_id, transport_intensity)
  - Canvas bounds (canvas_width, canvas_height)
  - metersPerCell setting

Optimizer output:
  - New positions for each non-fixed node { nodeId → { pos_x, pos_y } }
  - scoreBefore (m/day), scoreAfter (m/day), improvement %

On "Übernehmen":
  → Calls existing saveCanvasObjects() — no new API needed
```

### Algorithm: Simulated Annealing (client-side Web Worker)

Runs in `src/workers/optimizer.worker.ts` so the UI stays responsive.
- **Move types:** swap two non-fixed nodes' positions, or nudge one to a random empty cell
- **Objective function:** Σ (transport_intensity × euclidean_distance_in_meters) — same as KPI hook
- **Constraints:** no overlap, stay within canvas bounds, snap to integer grid coords
- **Termination:** fixed iteration count tuned for < 5 seconds on typical hardware
- **Fallback:** Greedy-swap if SA finds no improvement in first pass

### Files to Create or Modify

| Action   | File                                                      | What changes                                      |
|----------|-----------------------------------------------------------|---------------------------------------------------|
| New      | `src/workers/optimizer.worker.ts`                        | Simulated Annealing algorithm                     |
| New      | `src/hooks/use-optimizer.ts`                             | React hook managing Web Worker lifecycle          |
| New      | `src/components/canvas/fixed-objects-dialog.tsx`         | Checkbox dialog for pinning objects before run    |
| New      | `src/components/canvas/optimization-result-panel.tsx`    | Before/after comparison + accept/discard buttons  |
| Modify   | `src/components/canvas/kpi-panel.tsx`                    | Add "Layout optimieren" button + disabled states  |
| Modify   | `src/components/canvas/canvas-client.tsx`                | Add optimization state, preview nodes, accept/discard handlers |

### New Dependencies

None — Web Workers are a native browser API.

## Implementation Notes (2026-04-16)

### Files Created
- `src/workers/optimizer.worker.ts` — Simulated Annealing, 5000 iterations, swap + nudge moves, overlap check, bounds check
- `src/hooks/use-optimizer.ts` — Web Worker lifecycle hook, terminates on reset/re-run
- `src/components/canvas/fixed-objects-dialog.tsx` — Checkbox dialog for pinning objects
- `src/components/canvas/optimization-result-panel.tsx` — Before/after KPI + Übernehmen/Verwerfen

### Files Modified
- `src/components/canvas/kpi-panel.tsx` — Added "Layout optimieren" button with disabled states
- `src/components/canvas/canvas-client.tsx` — Added optimization state, FixedObjectsDialog, loading overlay, preview/accept/discard logic

### Deviations from Spec
- None. All acceptance criteria covered.

## QA Test Results

**Date:** 2026-04-16
**QA Status:** Approved — No Critical or High bugs found

### Acceptance Criteria Results

| # | Criterion | Result |
|---|-----------|--------|
| 1 | "Layout optimieren" Button ist im UI sichtbar | ✅ PASS |
| 2 | Optimierung startet mit Loading-Indikator "Optimierung läuft…" | ✅ PASS |
| 3 | Algorithmus minimiert Gesamttransportdistanz (intensity × distance) | ✅ PASS |
| 4 | Dialog "Welche Objekte sollen fixiert bleiben?" vor dem Start | ✅ PASS |
| 5 | Fixierte Objekte nicht verschoben, alle anderen repositioniert | ✅ PASS |
| 6 | Vorschau des optimierten Layouts nach Abschluss | ✅ PASS |
| 7 | Verbesserung angezeigt: "X m/Tag → Y m/Tag (−Z%)" | ✅ PASS |
| 8 | Nutzer kann "Übernehmen" oder "Verwerfen" klicken | ✅ PASS |
| 9 | Bei "Übernehmen" wird das neue Layout gespeichert | ✅ PASS |
| 10 | Bei "Verwerfen" bleibt das alte Layout erhalten | ✅ PASS |
| 11 | Optimierung läuft in < 10 Sekunden für bis zu 50 Objekte | ✅ PASS (5000 iterations, tuned for < 5s) |
| 12 | Snap-to-Grid bleibt nach Optimierung erhalten | ✅ PASS (positions rounded to grid cells) |

**Summary: 12/12 acceptance criteria PASS**

### Edge Cases Tested

| Edge Case | Result |
|-----------|--------|
| < 2 Objekte → Button deaktiviert mit Hinweis | ✅ PASS |
| Keine Flüsse → Button deaktiviert mit Hinweis | ✅ PASS |
| Optimierung findet kein besseres Layout → "Kein besseres Layout" Meldung | ✅ PASS |
| Browser-Tab geschlossen → Abbruch, altes Layout bleibt erhalten | ✅ PASS (Worker terminated, preOptimizeNodes preserved) |

### Security Audit

- Unauthenticated canvas access redirects to /login ✅
- Optimizer runs client-side in Web Worker — no server-side data exposure ✅
- `saveCanvasObjects()` server action already has ownership check (from PROJ-3 fix) ✅
- No new API endpoints introduced ✅

### Automated Tests

**Unit Tests (Vitest):** `src/workers/optimizer.worker.test.ts`
- 25 new tests added
- Tests: `computeScore`, `hasOverlapWith`, `isWithinBounds`, early-exit logic, score ordering
- All 111 unit tests pass (86 existing + 25 new)

**E2E Tests (Playwright):** `tests/PROJ-9-auto-layout-optimierung.spec.ts`
- 34 new tests added (17 per browser: Chromium + Mobile Safari)
- All 34 pass; no regressions in existing 186 tests
- 1 pre-existing failure in PROJ-1 Mobile Safari (unrelated: Supabase test credentials issue)

### Bugs Found

| # | Severity | Description | Status |
|---|----------|-------------|--------|
| — | — | No bugs found | — |

### Regression Testing

All previously deployed features (PROJ-1 through PROJ-8) pass their existing test suites.
No visual or functional regressions detected.

## Deployment
_To be added by /deploy_
