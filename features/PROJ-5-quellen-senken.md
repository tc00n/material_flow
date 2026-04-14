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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
