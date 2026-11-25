/**
 * Rahmen für alle Simulationen.
 *
 * Eine Simulation besteht aus zwei Teilen:
 *  1. der fest programmierten Physik und Zeichnung (`create`),
 *  2. einer Beschreibung dessen, was sich einstellen und anzeigen lässt
 *     (Regler, Anzeigen, Diagramme, Messgrößen, Voreinstellungen).
 *
 * Teil 2 ist reine Datenbeschreibung. Eine Lerneinheit kann sie über ihre
 * Inhaltsdatei anpassen (Regler ausblenden, Bereiche ändern, Voreinstellungen
 * ergänzen), ohne dass jemand Code anfassen muss. Bedienelemente, Messanzeige
 * und Diagramm baut `SimHost.svelte` daraus automatisch.
 */

/** Ein einstellbarer Wert: Schieberegler oder (mit `choices`) eine Auswahl. */
export interface ParamDef {
  key: string;
  label: string;
  /** Formelzeichen, Index mit Unterstrich: "v_0" */
  symbol?: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Startwert */
  value: number;
  /** Nachkommastellen in der Anzeige */
  digits?: number;
  /** Feste Auswahl statt Regler (z. B. Material, Schaltungsart) */
  choices?: { value: number; label: string }[];
  /**
   * true: Änderung wirkt sofort auf die laufende Simulation.
   * false (Standard): Änderung setzt die Simulation auf den Anfang zurück.
   */
  live?: boolean;
}

/** Ein-/ausblendbare Darstellung, z. B. Kraftpfeil oder Hilfslinien. */
export interface OptionDef {
  key: string;
  label: string;
  value: boolean;
}

export interface PlotDef {
  key: string;
  /** Kurzname für die Auswahl, z. B. "s(t)" */
  label: string;
  xLabel: string;
  yLabel: string;
  series: { label: string; color: string }[];
}

/** Messgröße, die die Simulation liefert (Anzeige und Übernahme ins Arbeitsblatt). */
export interface MeasureDef {
  key: string;
  label: string;
  symbol: string;
  unit: string;
  digits: number;
  /** false: nur fürs Arbeitsblatt, nicht in der Messanzeige */
  readout?: boolean;
}

export interface Preset {
  name: string;
  values: Record<string, number>;
}

export interface PlotData {
  x: number[];
  ys: number[][];
  xRange?: [number, number];
  yRange?: [number, number];
  /** Einzelne Messpunkte statt durchgezogener Linie */
  markers?: boolean;
  /** Zusätzliche Gerade y = m·x + t (z. B. Ausgleichsgerade) */
  line?: { m: number; t: number };
}

/** Zeichenfläche in CSS-Pixeln. */
export interface Stage {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

/** Was eine Simulation von ihrer Umgebung bekommt. */
export interface SimEnv {
  /** Aktuelle Reglerwerte, Schlüssel wie in `params` */
  p: Record<string, number>;
  /** Aktuelle Anzeigeoptionen, Schlüssel wie in `options` */
  show: Record<string, boolean>;
  /** Neu zeichnen lassen */
  invalidate(): void;
  /** Vorgang ist zu Ende (z. B. Ball gelandet): anhalten bis zum Zurücksetzen */
  finish(): void;
  /** Simulation starten (z. B. nach dem Loslassen eines gezogenen Körpers) */
  play(): void;
  isRunning(): boolean;
}

export type PointerKind = 'down' | 'move' | 'up';

export interface SimRuntime {
  /** Auf den Anfangszustand zurück (wird auch direkt nach `create` aufgerufen). */
  reset(): void;
  /** Ein Rechenschritt. Fehlt bei Standbildern, die nur auf Regler reagieren. */
  step?(dt: number): void;
  /** Ein Regler mit `live: true` (oder ein Standbild) wurde verändert. */
  update?(key: string): void;
  draw(g: Stage): void;
  /** Aktuelle Messwerte, Schlüssel wie in `measures`. null = noch nicht gemessen. */
  measure(): Record<string, number | null>;
  plot?(key: string): PlotData;
  /**
   * Maus/Finger auf der Zeichenfläche. Rückgabe: CSS-Cursor. Bei 'down'
   * bedeutet eine Rückgabe, dass die Simulation die Geste übernimmt.
   */
  pointer?(kind: PointerKind, x: number, y: number, g: Stage): string | void;
}

export interface SimDef {
  id: string;
  title: string;
  /** Ein Satz für Übersicht und Editor */
  summary: string;
  params: ParamDef[];
  options: OptionDef[];
  plots: PlotDef[];
  measures: MeasureDef[];
  presets?: Preset[];
  /** false: Standbild ohne Start-Taste */
  animated: boolean;
  /** Beschriftung der Start-Taste */
  playLabel?: string;
  /** Bedienhinweis unter den Reglern */
  hint?: string;
  /** Simulationszeit in s, die für das Vorschaubild vorgerechnet wird */
  thumbTime?: number;
  create(env: SimEnv): SimRuntime;
}

// ---------- Anpassung durch eine Lerneinheit ----------

export interface ParamOverride {
  hidden?: boolean;
  /** sichtbar, aber nicht veränderbar */
  locked?: boolean;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
}

export interface OptionOverride {
  hidden?: boolean;
  value?: boolean;
}

/** Der Abschnitt „Simulation“ in der Inhaltsdatei einer Lerneinheit. */
export interface SimConfig {
  id: string;
  params?: Record<string, ParamOverride>;
  options?: Record<string, OptionOverride>;
  /** Schlüssel der ausgeblendeten Diagramme */
  hiddenPlots?: string[];
  /** Ersetzt die Voreinstellungen der Simulation, falls angegeben */
  presets?: Preset[];
}

export interface ResolvedParam extends ParamDef {
  hidden: boolean;
  locked: boolean;
}
export interface ResolvedOption extends OptionDef {
  hidden: boolean;
}
export interface ResolvedSim {
  params: ResolvedParam[];
  options: ResolvedOption[];
  plots: PlotDef[];
  presets: Preset[];
}
