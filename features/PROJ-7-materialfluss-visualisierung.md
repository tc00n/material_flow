# PROJ-7: Materialfluss-Visualisierung (Spaghetti-Diagramm)

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
