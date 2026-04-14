# PROJ-5: Quellen & Senken Definition

## Status: Cancelled
**Created:** 2026-04-14
**Last Updated:** 2026-04-14
**Cancelled:** 2026-04-14

## Cancellation Rationale

Nach Architektur-Review entschieden, dass die explizite Unterscheidung zwischen "Quellen", "Senken" und "Maschinen" als Canvas-Objekttypen keinen Mehrwert für die Kernfeatures bringt:

- **PROJ-7 (Spaghetti-Diagramm):** Visualisiert Flüsse zwischen beliebigen Objekten — kein Bedarf an Typ-Unterscheidung.
- **PROJ-8 (Kennzahlen):** Transportwege lassen sich aus dem Flussgraphen ableiten, unabhängig vom Objekttyp.
- **PROJ-9 (Auto-Layout-Optimierung):** Fixierte Objekte (z.B. Wareneingang, Lager an der Wand) werden als **Randbedingungen beim Starten der Optimierung** angegeben — nicht vorab beim Platzieren auf dem Canvas. Das ist flexibler und erfordert keine semantische Vorab-Klassifizierung.

**Konsequenz:** Alle Canvas-Objekte sind gleichwertige Stationen. Der Berater platziert Maschinen, Lager, Arbeitsstationen etc. über die `machine_types`-Bibliothek (PROJ-4) — der Typ ist damit bereits implizit durch den Namen und die visuelle Darstellung (Farbe, Größe) codiert.

## Was mit dem `type`-Feld in `canvas_objects` passiert

Das Feld `type (enum: machine | source | sink)` in der Tabelle `canvas_objects` (eingeführt in PROJ-3) wird **nicht mehr für source/sink verwendet**. Mögliche Weiterentwicklung:

- Aktuell: Alle Objekte verwenden `type = 'machine'`
- Zukünftig (optional): Enum kann auf sinnvolle Kategorien erweitert werden, z.B. `machine | storage | workstation` — rein kosmetisch für Filterung in der Sidebar, ohne semantische Konsequenz für Algorithmen
- Die Unterscheidung ist in jedem Fall **kosmetisch**, nicht funktional

## Was PROJ-6 stattdessen bekommt

In PROJ-6 (Materialfluss-Definition) wird der Berater Flüsse **zwischen beliebigen Canvas-Objekten** definieren. Es gibt keine Vorbedingung "mindestens 1 Quelle + 1 Senke" mehr — jedes Objekt kann Anfangs- oder Endpunkt eines Flusses sein.

## Ursprüngliche User Stories (archiviert)

- As a consultant, I want to define material sources (Quellen) on the canvas so that I can model where materials enter the production process.
- As a consultant, I want to define material sinks (Senken) on the canvas so that I can model where materials leave the production process.
- As a consultant, I want to give each source and sink a name so that the flow diagram is readable.
- As a consultant, I want to visually distinguish sources and sinks from machines so that the layout is immediately understandable.

**Warum nicht mehr nötig:** Namen und visuelle Unterscheidung sind bereits durch `machine_types` (PROJ-4) abgedeckt. Ein "Wareneingang" ist einfach ein machine_type mit passendem Namen und Farbe.
