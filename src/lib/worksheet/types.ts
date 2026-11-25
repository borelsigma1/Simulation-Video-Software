/**
 * Beschreibung eines digitalen Arbeitsblatts.
 *
 * Ein Arbeitsblatt ist eine Liste von Bausteinen. Es ist reines JSON und
 * steht in der Inhaltsdatei der Lerneinheit (content/einheiten/<id>.json);
 * bearbeitet wird es im Lehrkraft-Modus.
 */
export interface Worksheet {
  title: string;
  /** z. B. "Mechanik · Jahrgangsstufe 8" */
  subtitle?: string;
  blocks: Block[];
}

export type Block = HeadingBlock | TextBlock | QuestionBlock | TableBlock | ChoiceBlock | ChartBlock | SnapshotBlock;
export type TaskBlock = QuestionBlock | TableBlock | ChoiceBlock | ChartBlock | SnapshotBlock;
export type BlockType = Block['type'];

export interface HeadingBlock {
  type: 'heading';
  text: string;
}

/** Erklärtext. Absätze mit Leerzeile trennen, **fett** ist erlaubt. */
export interface TextBlock {
  type: 'text';
  text: string;
}

/** Gemeinsame Angaben aller Aufgaben */
interface TaskBase {
  id: string;
  /** Aufgabenstellung, beginnt mit dem Operator ("Beschreibe …") */
  prompt: string;
  /** Schlüssel aus operators.ts, z. B. "beschreiben" */
  operator?: string;
  /** Erwartungshorizont, nur im Lehrkraft-Modus sichtbar */
  solution?: string;
}

/** Freitext-Antwort */
export interface QuestionBlock extends TaskBase {
  type: 'question';
  /** Höhe des Antwortfelds in Zeilen */
  lines?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  unit?: string;
  /**
   * Schlüssel eines Reglers oder einer Messgröße der Simulation. Ist er
   * gesetzt, füllt „Messwerte übernehmen“ diese Spalte automatisch.
   */
  source?: string;
}

/** Wertetabelle, Zeilen per Hand oder aus der Simulation füllbar */
export interface TableBlock extends TaskBase {
  type: 'table';
  columns: TableColumn[];
  rows: number;
}

export interface ChoiceBlock extends TaskBase {
  type: 'choice';
  options: string[];
  multiple?: boolean;
  /** Nummern der richtigen Optionen (ab 0), nur für den Erwartungshorizont */
  correct?: number[];
}

/** Diagramm aus zwei Spalten einer Wertetabelle des Arbeitsblatts */
export interface ChartBlock extends TaskBase {
  type: 'chart';
  /** id der Wertetabelle */
  table: string;
  /** Spaltenschlüssel für Rechts- und Hochachse */
  x: string;
  y: string;
  /** Schülerinnen und Schüler dürfen eine Ausgleichsgerade einblenden */
  fit?: boolean;
}

/** Bild der Simulation einfügen (z. B. eine Bahnkurve) */
export interface SnapshotBlock extends TaskBase {
  type: 'snapshot';
}

export const isTask = (b: Block): b is TaskBlock => b.type !== 'heading' && b.type !== 'text';

export const BLOCK_NAMES: Record<BlockType, string> = {
  heading: 'Überschrift',
  text: 'Text',
  question: 'Freitext-Aufgabe',
  table: 'Wertetabelle',
  choice: 'Auswahlaufgabe',
  chart: 'Diagrammaufgabe',
  snapshot: 'Bild der Simulation'
};

/** Antworten der Schülerin/des Schülers. Lebt nur im Arbeitsspeicher. */
export interface Answers {
  name: string;
  klasse: string;
  datum: string;
  text: Record<string, string>;
  tables: Record<string, string[][]>;
  choices: Record<string, number[]>;
  snapshots: Record<string, string | null>;
  /** Diagrammaufgaben: Ausgleichsgerade eingeblendet? */
  fits: Record<string, boolean>;
  /** Diagrammaufgaben: fertiges Bild für den PDF-Export */
  charts: Record<string, string | null>;
}

export function emptyAnswers(ws: Worksheet): Answers {
  const a: Answers = {
    name: '',
    klasse: '',
    datum: new Date().toLocaleDateString('de-DE'),
    text: {},
    tables: {},
    choices: {},
    snapshots: {},
    fits: {},
    charts: {}
  };
  for (const b of ws.blocks) {
    if (b.type === 'question') a.text[b.id] = '';
    if (b.type === 'table') a.tables[b.id] = Array.from({ length: Math.max(1, b.rows) }, () => b.columns.map(() => ''));
    if (b.type === 'choice') a.choices[b.id] = [];
    if (b.type === 'snapshot') a.snapshots[b.id] = null;
    if (b.type === 'chart') {
      a.fits[b.id] = false;
      a.charts[b.id] = null;
      a.text[b.id] = '';
    }
  }
  return a;
}

export function hasContent(a: Answers): boolean {
  return (
    Object.values(a.text).some((t) => t.trim() !== '') ||
    Object.values(a.tables).some((rows) => rows.some((r) => r.some((c) => c.trim() !== ''))) ||
    Object.values(a.choices).some((c) => c.length > 0) ||
    Object.values(a.snapshots).some((s) => s !== null)
  );
}

/** "3,14" oder "3.14" -> 3.14; leere oder unlesbare Einträge -> NaN */
export function parseNumber(s: string): number {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return NaN;
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
}

/** Fortlaufende Aufgabennummern (Überschriften und Texte zählen nicht). */
export function taskNumbers(ws: Worksheet): (number | null)[] {
  let n = 0;
  return ws.blocks.map((b) => (isTask(b) ? ++n : null));
}
