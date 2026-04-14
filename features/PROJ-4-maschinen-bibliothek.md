# PROJ-4: Maschinen & Anlagen Bibliothek

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-3 (Layout Canvas) — Objekte werden aus der Bibliothek auf den Canvas gezogen

## User Stories
- As a consultant, I want to create custom machine/station types with a name, size, and color so that I can represent the real factory equipment.
- As a consultant, I want to see a list of all available machine types in a sidebar so that I can quickly find and place them.
- As a consultant, I want to edit an existing machine type so that I can correct mistakes.
- As a consultant, I want to delete a machine type from the library so that I can keep it clean.
- As a consultant, I want placed instances to update visually when I change the type so that my layout stays consistent.

## Acceptance Criteria
- [ ] Seitenleiste zeigt alle definierten Maschinen-/Anlagentypen des Projekts
- [ ] Neuen Typ erstellen: Name (Pflicht), Breite x Tiefe in Metern (Pflicht), Farbe (Pflicht), Beschreibung (optional)
- [ ] Jeder Typ wird als farbiges, beschriftetes Rechteck dargestellt
- [ ] Drag & Drop aus Bibliothek auf Canvas platziert eine Instanz des Typs
- [ ] Mehrere Instanzen desselben Typs können platziert werden
- [ ] Typ bearbeiten: Alle Felder änderbar, Änderungen aktualisieren alle platzierten Instanzen
- [ ] Typ löschen: Nur möglich wenn keine Instanzen auf dem Canvas platziert sind — sonst Fehlermeldung
- [ ] Bibliothek-Einträge sind alphabetisch sortiert

## Edge Cases
- Was passiert, wenn ein Typname bereits existiert? → Validierungsfehler ("Name bereits vergeben")
- Was passiert, wenn Breite oder Tiefe 0 eingegeben wird? → Validierungsfehler (Mindestgröße: 0.5m x 0.5m)
- Was passiert, wenn ein Typ mit platzierten Instanzen gelöscht werden soll? → Blockiert mit Meldung, wie viele Instanzen betroffen sind
- Was passiert bei sehr vielen Typen (> 30)? → Suchfeld in der Seitenleiste

## Technical Requirements
- Typen in Supabase (Tabelle: machine_types, verknüpft mit project_id)
- Instanzen auf Canvas referenzieren den Typ (Foreign Key)
- Farbauswahl: Vordefinierte Palette (10-15 Farben) oder Custom Hex-Input

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
