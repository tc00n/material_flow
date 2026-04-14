# PROJ-11: Export & Report (PDF)

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-7 (Materialfluss-Visualisierung)
- Requires: PROJ-8 (Kennzahlen-Berechnung)

## User Stories
- As a consultant, I want to export the layout with flow visualization as a PDF so that I can include it in client presentations.
- As a consultant, I want the PDF to include the KPIs so that I don't need to copy numbers manually.

## Acceptance Criteria
- [ ] "Export als PDF" Button im Canvas-Bereich
- [ ] PDF enthält: Layout-Canvas mit aktiver Fluss-Visualisierung, alle KPIs, Projektname, Datum
- [ ] PDF-Format: A4 Querformat (Landscape)
- [ ] Layout ist zentriert und lesbar (kein Abschneiden von Inhalten)
- [ ] Dateiname: "[Projektname]_[Datum].pdf"

## Edge Cases
- Was passiert, wenn das Layout sehr groß ist und nicht auf A4 passt? → Automatisches Skalieren
- Was passiert, wenn keine Flüsse visualisiert werden (Toggle off)? → PDF zeigt Layout ohne Flusslinien

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
