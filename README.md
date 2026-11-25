# Physik-Workspace

Ein digitaler Arbeitsplatz für den Physikunterricht (Gymnasium, Klasse 7–13):
**interaktive Simulationen**, **digitale Arbeitsblätter** und **Lernvideos** an einem Ort.
Läuft komplett im Browser, auch auf Tablets, und speichert keine Schülerdaten.

> Später soll daraus zusätzlich eine Android-/iPad-App werden (über Capacitor, gleicher Code).

## Was es schon gibt

| Seite | Inhalt |
| --- | --- |
| `index.html` | Übersicht |
| `lektionen/federpendel/` | Lerneinheit: Video-Platz, Simulation Federpendel, Arbeitsblatt mit Messwerttabellen und PDF-Export |
| `sims/schiefer-wurf/` | Simulation schiefer Wurf (Winkel, Geschwindigkeit, Höhe, Ort; Bahnen vergleichen; Geschwindigkeitskomponenten; Diagramme) |
| `sims/federpendel/` | Simulation Federpendel (Masse, Federkonstante, Dämpfung; Körper ziehbar; Periodendauer-Messung; s(t), v(t), a(t), Energien) |

## Starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.

```bash
npm install        # einmalig
npm run dev        # Entwicklungsserver, http://localhost:5173
```

Weitere Befehle:

```bash
npm run build      # kompletter Workspace nach dist/
npm run build:sim  # jede Simulation einzeln nach dist-sim/<name>/
npm run build:sim -- federpendel   # nur eine Simulation
npm test           # Tests der Physik-Modelle
npm run check      # Typprüfung
```

## Technik

- **TypeScript + Svelte 5 + Vite**: schnelle, kleine Seiten; jede Seite ist eine eigene statische HTML-Datei.
- **Canvas 2D** für die Simulationen, mit fester Zeitschrittweite (240 Rechenschritte pro Sekunde) und
  Zeichnen im Bildschirmtakt. Dadurch flüssig mit 60 fps (bzw. 120 fps auf entsprechenden Tablets) und
  reproduzierbare Ergebnisse. Für aufwendige Szenen kann später PixiJS (WebGL), für 3D Three.js dazukommen.
- **uPlot** für Live-Diagramme (sehr schnell, auch mit vielen Messpunkten).
- **jsPDF** für den PDF-Export, wird erst beim Klick geladen.

## Aufbau des Codes

```
src/
  lib/
    engine/      Simulationsschleife, Canvas-Helfer, Farben, Zeichenfunktionen
    plot/        Live-Diagramm (uPlot)
    ui/          Regler, Schalter, Start/Pause, Anzeigen, Layout einer Simulation
    measure/     Messwert-Schnittstelle zwischen Simulation und Arbeitsblatt
    worksheet/   Arbeitsblatt-Format, Anzeige, PDF-Export
    video/       Video-Bereich (eigene Datei oder YouTube mit Zwei-Klick-Lösung)
  sims/<name>/   je Simulation: model.ts (reine Physik, getestet), <Name>.svelte (Darstellung), main.ts
  lessons/<name> je Lerneinheit: arbeitsblatt.ts, lesson.ts (Titel, Video), main.ts
sims/<name>/index.html        Einstiegsseite einer Simulation
lektionen/<name>/index.html   Einstiegsseite einer Lerneinheit
```

Die Physik steckt jeweils in `model.ts` ohne Bezug zur Darstellung. So lässt sie sich testen
(`*.test.ts`) und später auch für Videos wiederverwenden.

## Eine neue Simulation hinzufügen

1. Ordner `src/sims/<name>/` anlegen, am einfachsten `federpendel` kopieren.
2. Physik in `model.ts` schreiben und mit einem Test absichern.
3. Darstellung in `<Name>.svelte`: Zustand im `step(dt)` weiterrechnen, im `draw()` zeichnen.
   Messwerte für Arbeitsblätter mit `measurements.define(...)` / `measurements.set(...)` veröffentlichen.
4. `sims/<name>/index.html` anlegen (Kopie einer vorhandenen, Pfad zu `main.ts` anpassen)
   und in `vite.config.ts` bei `pages` eintragen.
5. In `src/pages/Overview.svelte` verlinken.

## Arbeitsblätter

Ein Arbeitsblatt ist eine Liste von Bausteinen (siehe `src/lessons/federpendel/arbeitsblatt.ts`):

- `heading`, `text` (Absätze, **fett** möglich)
- `question`: Freitextantwort
- `choice`: Auswahl (eine oder mehrere Antworten)
- `table`: Wertetabelle. Spalten mit `source` werden per „Messwerte übernehmen“ aus der Simulation gefüllt.
- `snapshot`: Momentaufnahme der Simulation als Bild

Die Schülerinnen und Schüler laden ihr ausgefülltes Blatt als PDF herunter und geben es z. B. über
die Schulplattform ab.

## Lernvideos

In `src/lessons/<name>/lesson.ts` eintragen:

- eigene Datei: Video nach `public/videos/` legen, dann `source: { kind: 'file', src: 'videos/datei.mp4' }`
  (optional mit Untertiteln: `captions: 'videos/datei.vtt'`)
- YouTube: `source: { kind: 'youtube', id: 'VIDEO_ID' }`. Das Video wird erst nach einem Klick geladen
  (über youtube-nocookie.com), vorher wird nichts an YouTube übertragen.

GitHub erlaubt höchstens 100 MB pro Datei; größere Videos besser extern hosten.

## Einzelne Simulation weitergeben oder einbetten

`npm run build:sim -- schiefer-wurf` erzeugt `dist-sim/schiefer-wurf/` mit nur dieser Simulation.
Den Ordner kann man auf einen beliebigen Webserver oder ins Schul-LMS legen. Die GitHub Action stellt
diese Ordner bei jedem Lauf auch als Download („einzelne-simulationen“) bereit.

Einbetten per iframe, ohne Kopfzeile:

```html
<iframe src="https://borelsigma1.github.io/Simulation-Video-Software/sims/federpendel/?embed"
        width="100%" height="900" style="border:0"></iframe>
```

Hinweis: Wegen der JavaScript-Module muss die Seite über einen Webserver geöffnet werden,
ein Doppelklick auf `index.html` reicht nicht.

## Datenschutz

- Keine Anmeldung, keine Cookies, kein Tracking, keine Server-Speicherung.
- Arbeitsblatt-Eingaben liegen nur im Arbeitsspeicher des Browser-Tabs. Beim Schließen warnt die Seite,
  falls noch etwas eingetragen ist.
- Der PDF-Export passiert vollständig im Browser.
- Externe Videos werden erst nach ausdrücklichem Klick geladen.

## Veröffentlichen (GitHub Pages)

Die GitHub Action `.github/workflows/pages.yml` prüft, testet und baut bei jedem Push.
Auf `main` wird automatisch veröffentlicht. Einmalig in GitHub einstellen:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.
Danach ist der Workspace unter `https://borelsigma1.github.io/Simulation-Video-Software/` erreichbar.

## Nächste Schritte (Ideen)

- Messwerte aus Tabellen direkt als Diagramm (z. B. T² über m) mit Ausgleichsgerade
- Weitere Simulationen (Fadenpendel, Wellen, elektrische Felder, Optik)
- Editor für Arbeitsblätter, damit Lehrkräfte ohne Code neue Blätter erstellen können
- Export von Simulationen als Video für Erklärvideos
- App für Android/iPad mit Capacitor
