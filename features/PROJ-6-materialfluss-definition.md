# PROJ-6: Materialfluss-Definition

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-4 (Maschinen Bibliothek) — Maschinen sind die Knoten des Flussgraphen
- Requires: PROJ-5 (Quellen & Senken) — Quellen und Senken sind Start/Endpunkte

## User Stories
- As a consultant, I want to define a material flow between two stations (machine, source, or sink) so that I can model the production process.
- As a consultant, I want to specify the transport quantity per flow (units/hour or units/day) so that the intensity of the flow is captured.
- As a consultant, I want to specify the transport frequency (trips/day) so that I can differentiate between high and low frequency flows.
- As a consultant, I want to see all defined flows in a list so that I can review and edit them.
- As a consultant, I want to delete a flow so that I can correct mistakes.

## Acceptance Criteria
- [ ] Flüsse werden in einer separaten "Materialfluss" Tabelle/Panel verwaltet (nicht direkt auf Canvas gezeichnet)
- [ ] Neuen Fluss erstellen: Von (Pflicht), Nach (Pflicht), Menge pro Transport in Einheiten (Pflicht), Transporte pro Tag (Pflicht), Material-Bezeichnung (optional)
- [ ] "Von" und "Nach" sind Dropdowns mit allen Canvas-Objekten (Maschinen, Quellen, Senken)
- [ ] Ein Fluss kann nicht von einem Objekt zu sich selbst gehen → Validierungsfehler
- [ ] Alle definierten Flüsse werden in einer übersichtlichen Tabelle angezeigt (Von → Nach, Menge, Frequenz)
- [ ] Flüsse können bearbeitet werden (alle Felder editierbar)
- [ ] Flüsse können gelöscht werden
- [ ] Transportmenge muss > 0 sein
- [ ] Transportfrequenz muss > 0 sein
- [ ] Bidirektionale Flüsse (A→B und B→A) sind als separate Einträge möglich

## Edge Cases
- Was passiert, wenn ein Canvas-Objekt gelöscht wird, das in einem Fluss vorkommt? → Alle verknüpften Flüsse werden ebenfalls gelöscht (Kaskadierung), Nutzer wird informiert
- Was passiert, wenn derselbe Fluss (Von+Nach) doppelt angelegt wird? → Warnung anzeigen, aber nicht blockieren (könnte verschiedene Materialien sein)
- Was passiert, wenn keine Flüsse definiert sind und Visualisierung aufgerufen wird? → Hinweis "Bitte zunächst Materialflüsse definieren"

## Technical Requirements
- Daten in Supabase (Tabelle: material_flows, mit from_node_id, to_node_id, quantity, frequency, material_name)
- Transportintensität (quantity × frequency) wird berechnet und gespeichert → Basis für Visualisierung und Optimierung
- Kaskadierendes Löschen bei Objekt-Löschung (Foreign Key mit ON DELETE CASCADE)

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
