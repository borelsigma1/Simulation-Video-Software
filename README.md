# Physik-Workspace

Ein digitaler Arbeitsplatz für den Physikunterricht am bayerischen Gymnasium (Jahrgangsstufen 7 bis 13):
**interaktive Simulationen**, **digitale Arbeitsblätter** und **Lernvideos** an einem Ort.
Läuft komplett im Browser, auch auf Tablets, und speichert keine Schülerdaten.

> Später soll daraus zusätzlich eine Android-/iPad-App werden (über Capacitor, gleicher Code).

## Was es gibt

- **Startseite** mit Auswahl der Jahrgangsstufe. Jede Lerneinheit besteht aus einer Simulation und einem
  Arbeitsblatt, optional einem Video.
- **Lerneinheit mit geteiltem Bildschirm**: links das Experiment (Zeichnung, darunter kompakt Regler und
  Diagramm, ohne Scrollen), rechts das Arbeitsblatt mit eigener Bildlaufleiste. Auf schmalen oder
  hochkant gehaltenen Bildschirmen wechselt man über zwei Reiter „Experiment“ und „Arbeitsblatt“.
- **Direkt in der Zeichnung bedienen**: Wo es sinnvoll ist, lassen sich Gegenstände ziehen oder antippen
  (Linse, Schatten, Federkraftmesser, Energiebahn, Wurf, Stoß, Kreisbewegung, Potentialtopf, Kondensator,
  Dichte, Federpendel, Doppelspalt, Schaltungen). Ein „i“ in der Zeichnung erklärt, was geht.
- **Arbeitsblätter** zum Ausfüllen im Browser: Aufgaben mit Operatoren nach bayerischem Katalog,
  Wertetabellen mit Übernahme der Messwerte aus der Simulation, Diagramme aus den eigenen Messwerten mit
  Ausgleichsgerade, Auswahlaufgaben, Bild der Simulation, PDF-Export im Stil der Webseite.
- **Formelsatz mit KaTeX**: In Inhaltsdateien steht Mathematik zwischen Dollarzeichen, z. B.
  `$E_{\mathrm{kin}} = \tfrac{1}{2}\,m\,v^2$`. Formelzeichen, Einheiten und Zahlen der Simulationen werden
  automatisch gesetzt.
- **Schrödinger-Labore** (Jgst. 13): stationäre Schrödingergleichung in sieben Potenzialen und das
  Wasserstoffatom mit radialer Welle, Ebene und Orbitalen in 3D.
- **Lehrkraft-Modus** (`#/lehrkraft`): Lerneinheiten bearbeiten, duplizieren, neu anlegen, exportieren und
  importieren, ohne Code anzufassen.

Lerneinheiten (nach LehrplanPLUS):

| Jgst. | Einheiten |
| --- | --- |
| 7 | Dichte bestimmen · Kern- und Halbschatten · Schaltungen mit zwei Schaltern |
| 8 | Kennlinien · Sammellinse · Kraft und Dehnung |
| 9 | Energieumwandlung auf der Bahn · Wasserkocher · Teilchenmodell |
| 10 | Stöße und Impulserhaltung · Waagrechter Wurf · Radioaktiver Zerfall |
| 11 | Kreisbewegung · Federpendel · Licht am Doppelspalt |
| 12 | Elektronen im Querfeld · Fadenstrahlrohr · Kondensator laden und entladen |
| 13 | Doppelspalt mit Elektronen · Potentialtopf · Zerfallsgesetz und C-14 · Schrödinger-Labor · Wasserstoffatom |

## Starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.

```bash
npm install        # einmalig
npm run dev        # Entwicklungsserver, http://localhost:5173
```

Weitere Befehle:

```bash
npm run build      # kompletter Workspace nach dist/
npm run build:sim  # jede Simulation einzeln nach dist-sim/<kennung>/ (zum Einbetten, z. B. in mebis)
npm run build:sim -- federpendel   # nur eine Simulation
npm test           # Tests: Physik-Modelle, alle Lerneinheiten, Anpassungslogik
npm run check      # Typprüfung
```

## Inhalt und Code sind getrennt

```
content/einheiten/<kennung>.json   je Lerneinheit eine Datei: Titel, Jahrgangsstufe, Lehrplanbezug,
                                   Anpassungen der Simulation, Arbeitsblatt mit Erwartungshorizont
src/sims/                          die Simulationen (Physik und Zeichnung, fest programmiert)
```

Eine Lerneinheit verweist auf eine Simulation und darf sie **anpassen, aber nicht umprogrammieren**:

- Regler ein- oder ausblenden, sperren, umbenennen; Bereich, Schrittweite und Startwert ändern
  (nur innerhalb der Grenzen, die die Simulation vorgibt)
- Anzeigen (Pfeile, Hilfslinien …) und Diagramme vorbelegen oder ausblenden
- Voreinstellungen („Erde“, „Mond“ …) festlegen

Dieselbe Simulation kann so in mehreren Einheiten stecken, etwa die Wurfbewegung als waagrechter Wurf
in Jgst. 10 (Winkel ausgeblendet und auf 0° gesetzt).

## Lehrkraft-Modus

Auf der Startseite oben rechts „Für Lehrkräfte“. Links das Formular, rechts die Vorschau.

- Änderungen liegen zuerst als **Entwurf nur im eigenen Browser**. Die Klasse sieht davon nichts.
- **Veröffentlichen** schreibt die Datei nach `content/einheiten/` ins Repository; GitHub baut die Seite
  dann neu (etwa zwei Minuten). Dafür ist einmalig ein persönliches GitHub-Zugriffstoken nötig
  (fine-grained, nur dieses Repository, Berechtigung „Contents: Read and write“). Es bleibt im Browser
  gespeichert und lässt sich dort wieder löschen. Die Anleitung steht im Veröffentlichen-Dialog.
- **Ohne Token**: „Als Datei exportieren“ und die Datei von Hand nach `content/einheiten/` legen.
  „Datei importieren“ liest eine solche Datei wieder ein.

Hinweis: Der Erwartungshorizont steht in denselben Dateien. Er wird der Klasse nicht angezeigt, ist in
einem öffentlichen Repository aber grundsätzlich auffindbar.

## Technik

- **TypeScript + Svelte 5 + Vite**, eine einzige Seite mit Adressen der Form `#/einheit/<kennung>`.
  Dadurch funktioniert alles auf GitHub Pages, eingebettet und später in der App.
- **Canvas 2D** für Simulationen und Diagramme. Feste Zeitschrittweite (240 Rechenschritte pro Sekunde),
  gezeichnet wird im Bildschirmtakt.
- **KaTeX** für Formeln auf der Seite.
- **PDF-Export**: Das Blatt wird unsichtbar als HTML im Stil der Seite gesetzt und dann mit jsPDF und
  svg2pdf.js als Vektor-PDF nachgezeichnet (eingebettete Schriften, Formeln in KaTeX-Schriften). Das Modul
  wird erst beim Klick geladen. Die Schriften dafür liegen als TTF in `src/lib/worksheet/pdf-fonts/`.
- **Schrödinger-Labore** (`src/labs/schroedinger/`) laufen in einem Shadow-DOM und werden erst beim Öffnen
  geladen.
- Schriften liegen im Projekt (keine Abrufe bei Google o. Ä.).

```
src/
  lib/
    engine/      Simulationsschleife, Canvas-Helfer, Farben, Zeichenfunktionen
    sim/         Rahmen für alle Simulationen: Typen, SimHost (Regler, Anzeigen, Diagramm), Anpassungen
    plot/        Diagramme
    ui/          Regler, Schalter, Start/Pause, Anzeigen
    measure/     Messwert-Schnittstelle zwischen Simulation und Arbeitsblatt
    worksheet/   Arbeitsblatt-Format, Operatoren, Anzeige, PDF-Export
    tex/         Formelsatz (KaTeX), Formelzeichen und Einheiten nach TeX
    content/     Lerneinheiten laden, prüfen, Entwürfe
    editor/      Formulare des Lehrkraft-Modus, Veröffentlichen über GitHub
    video/       Video-Bereich (eigene Datei oder YouTube mit Zwei-Klick-Lösung)
  pages/         Startseite, Lerneinheit, Simulation allein, Lehrkraft-Modus, Editor
  sims/          Simulationen und ihr Verzeichnis (index.ts)
```

## Eine neue Simulation hinzufügen

1. Datei `src/sims/<name>.ts` anlegen, am einfachsten eine vorhandene kopieren (`hooke.ts` ist ein gutes
   Beispiel ohne Animation, `energiebahn.ts` eines mit).
2. Oben beschreiben, was es gibt: Regler (`params`), Anzeigen (`options`), Diagramme (`plots`),
   Messgrößen (`measures`). Daraus entstehen Bedienfeld, Editor-Formular und die Messwert-Übernahme
   von selbst.
3. In `create(env)` die Physik (`step`), die Zeichnung (`draw`) und die Messwerte (`measure`) schreiben.
   Aufwendigere Physik gehört in eine eigene, getestete Datei (siehe `federpendel/model.ts`).
4. In `src/sims/index.ts` eintragen. Danach lässt sich im Lehrkraft-Modus eine Einheit damit anlegen.

## Datenschutz

- Antworten auf Arbeitsblättern bleiben im Browser des Geräts; es wird nichts an einen Server geschickt.
- Das PDF entsteht lokal im Browser.
- YouTube-Videos werden erst nach einem Klick geladen.
