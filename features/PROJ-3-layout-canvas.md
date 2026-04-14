# PROJ-3: Layout Canvas (Drag & Drop)

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-2 (Projekt-Dashboard) — Canvas wird innerhalb eines Projekts geöffnet

## User Stories
- As a consultant, I want to see a grid-based canvas representing the factory floor so that I can place machines spatially.
- As a consultant, I want to drag and drop machines/stations onto the canvas so that I can build a production layout.
- As a consultant, I want to move placed machines by dragging them so that I can adjust the layout.
- As a consultant, I want to resize the canvas area so that I can represent different factory sizes.
- As a consultant, I want the canvas to scale (zoom in/out) so that I can work on large and detailed layouts.
- As a consultant, I want my layout to be automatically saved so that I don't lose work.

## Acceptance Criteria
- [ ] Canvas zeigt ein Raster (Grid) als Fabrikhallen-Grundriss
- [ ] Rasterbreite und -höhe sind konfigurierbar (z.B. 1 Rastereinheit = 1 Meter)
- [ ] Maschinen/Stationen können per Drag & Drop aus einer Seitenleiste auf den Canvas gezogen werden
- [ ] Platzierte Objekte können auf dem Canvas frei verschoben werden (Snap-to-Grid)
- [ ] Objekte können nicht außerhalb der Canvasgrenzen platziert werden
- [ ] Zoom In/Out ist möglich (Mausrad oder Buttons, min. 25%, max. 200%)
- [ ] Pan (Verschieben des sichtbaren Bereichs) ist per Maus möglich
- [ ] Layout wird automatisch gespeichert (Debounce nach Änderung, max. 2 Sekunden Verzögerung)
- [ ] Speicher-Status wird angezeigt ("Gespeichert" / "Speichern..." / "Fehler")
- [ ] Objekte können auf dem Canvas selektiert werden (Klick → Highlight)
- [ ] Selektiertes Objekt kann per Entf-Taste oder Button gelöscht werden

## Edge Cases
- Was passiert, wenn zwei Objekte überlappen? → Visuelle Warnung (rote Umrandung), aber kein Blockieren
- Was passiert beim Schließen des Browsers ohne Speichern? → Auto-Save verhindert Datenverlust
- Was passiert auf kleinen Bildschirmen (< 1280px)? → Hinweis: "Für optimale Nutzung Desktop-Browser verwenden"
- Was passiert, wenn sehr viele Objekte (> 100) auf dem Canvas sind? → Performance-Test erforderlich

## Technical Requirements
- Canvas-Implementierung: React Flow oder Konva.js (kein SVG-only)
- Snap-to-Grid mit konfigurierbarer Rastergröße
- Auto-Save mit Debounce (2s), Daten in Supabase
- Performance: Ruckelfrei bei bis zu 100 Objekten auf dem Canvas

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
