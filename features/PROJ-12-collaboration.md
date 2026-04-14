# PROJ-12: Collaboration (Mehrere Nutzer)

## Status: Planned
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-2 (Projekt-Dashboard)

## User Stories
- As a consultant, I want to share a project with a colleague so that we can work on it together.
- As a consultant, I want to see who else is currently viewing/editing a project so that we avoid conflicts.

## Acceptance Criteria
- [ ] Projekte können per E-Mail mit anderen registrierten Nutzern geteilt werden
- [ ] Geteilte Projekte erscheinen im Dashboard des eingeladenen Nutzers
- [ ] Rollen: Owner (volle Rechte), Editor (bearbeiten, kein Löschen), Viewer (nur lesen)
- [ ] Live-Cursor anderer Nutzer werden auf dem Canvas angezeigt

## Edge Cases
- Was passiert, wenn zwei Nutzer gleichzeitig dasselbe Objekt verschieben? → Last-write-wins mit kurzer Benachrichtigung
- Was passiert, wenn ein eingeladener Nutzer keinen Account hat? → Einladungs-E-Mail mit Registrierungslink

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
