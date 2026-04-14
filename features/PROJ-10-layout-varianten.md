# PROJ-10: Layout-Varianten Vergleich

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-3 (Layout Canvas)
- Requires: PROJ-8 (Kennzahlen-Berechnung) — Kennzahlen werden pro Variante verglichen

## User Stories
- As a consultant, I want to create multiple layout variants within one project so that I can compare different arrangements.
- As a consultant, I want to see the KPIs of all variants side by side so that I can make a data-driven recommendation to the client.
- As a consultant, I want to switch between variants so that I can show different scenarios in a client meeting.

## Acceptance Criteria
- [ ] Ein Projekt kann mehrere Layout-Varianten haben (min. 1, empfohlen: bis zu 5)
- [ ] Neue Variante kann als Kopie einer bestehenden Variante erstellt werden
- [ ] Varianten können benannt werden (z.B. "Variante A – Aktuell", "Variante B – Optimiert")
- [ ] Vergleichsansicht zeigt KPIs aller Varianten nebeneinander in einer Tabelle
- [ ] Aktive Variante ist im Canvas-Bereich klar erkennbar

## Edge Cases
- Was passiert, wenn eine Variante gelöscht wird, die die einzige ist? → Löschen blockiert
- Was passiert bei > 5 Varianten? → Warnung, aber kein hartes Limit

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
