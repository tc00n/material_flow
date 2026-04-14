# Product Requirements Document

## Vision
Ein webbasiertes Materialfluss-Analyse-Tool für Unternehmensberater, das es ermöglicht, Produktionslayouts interaktiv zu gestalten, Materialflüsse zu definieren und automatisch das optimale Layout zu berechnen. Das Tool ersetzt aufwändige Excel-Lösungen und CAD-Tools durch eine intuitive, präsentierbare Webanwendung.

## Target Users
**Primäre Nutzer: Unternehmensberater (intern)**
- Erstellen Produktionslayouts für Kundenprojekte
- Müssen Ergebnisse professionell präsentieren können
- Haben kein CAD-Wissen, aber Verständnis von Produktionsprozessen
- Arbeiten an mehreren Kundenprojekten gleichzeitig
- Brauchen schnelle, nachvollziehbare Optimierungsvorschläge

**Pain Points:**
- Excel/Visio-basierte Ansätze sind fehleranfällig und nicht interaktiv
- Keine automatische Berechnung von Transportkennzahlen
- Keine schnelle Layout-Optimierung ohne spezialisierte Software (z.B. visTABLE ~4.000€/Jahr)

## Core Features (Roadmap)

| Priority | ID | Feature | Status |
|----------|-----|---------|--------|
| P0 (MVP) | PROJ-1 | User Authentication (Login/Logout) | Planned |
| P0 (MVP) | PROJ-2 | Projekt-Dashboard (Projekte verwalten) | Planned |
| P0 (MVP) | PROJ-3 | Layout Canvas (Drag & Drop) | Planned |
| P0 (MVP) | PROJ-4 | Maschinen & Anlagen Bibliothek | Planned |
| P0 (MVP) | PROJ-5 | Quellen & Senken Definition | Planned |
| P0 (MVP) | PROJ-6 | Materialfluss-Definition | Planned |
| P0 (MVP) | PROJ-7 | Materialfluss-Visualisierung (Spaghetti-Diagramm) | Planned |
| P0 (MVP) | PROJ-8 | Kennzahlen-Berechnung | Planned |
| P0 (MVP) | PROJ-9 | Auto-Layout-Optimierung | Planned |
| P1 | PROJ-10 | Layout-Varianten Vergleich | Planned |
| P1 | PROJ-11 | Export & Report (PDF) | Planned |
| P2 | PROJ-12 | Collaboration (Mehrere Nutzer) | Planned |

## Success Metrics
- Berater kann ein vollständiges Produktionslayout mit Materialfluss in < 30 Minuten erstellen
- Auto-Optimierung liefert ein Ergebnis in < 10 Sekunden
- Ergebnisse sind direkt in Kundenpräsentationen verwendbar (professionelles Design)
- Transportkosteneinsparung durch Optimierung ist klar quantifiziert

## Constraints
- Solo-Entwickler (ein Entwickler)
- Kein Budget für kostenpflichtige externe APIs oder KI-Dienste
- Optimierungsalgorithmus muss selbst implementiert werden (z.B. simulated annealing oder genetischer Algorithmus)
- Muss professionell genug aussehen für Kundenpräsentationen
- Tech Stack: Next.js, Supabase, TypeScript, Tailwind CSS

## Non-Goals
- 3D-Visualisierung (nur 2D Draufsicht für MVP)
- CAD-Import/Export
- Echtzeit-Collaboration zwischen Nutzern (P2)
- Mobile App (nur Desktop-Browser)
- Integration mit ERP-Systemen
- Externe Kunden-Accounts (nur interne Berater)
