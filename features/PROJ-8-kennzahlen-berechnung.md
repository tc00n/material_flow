# PROJ-8: Kennzahlen-Berechnung

## Status: Planned
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
- Was passiert, wenn Quelle und Senke direkt übereinander liegen (Distanz = 0)? → Distanz wird als 0 angezeigt, kein Crash
- Was passiert, wenn der Kostensatz auf 0 gesetzt wird? → Transportkosten = 0 €/Tag, kein Fehler

## Technical Requirements
- Berechnung erfolgt client-seitig (JavaScript) für Echtzeit-Updates ohne Server-Roundtrip
- Distanz in Meter = Pixel-Distanz × (Rastergröße in Meter / Rastergröße in Pixel)
- Berechnung wird bei Objekt-Bewegung mit Debounce (100ms) ausgelöst

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
