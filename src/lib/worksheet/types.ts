/**
 * Beschreibung eines digitalen Arbeitsblatts.
 *
 * Ein Arbeitsblatt ist eine Liste von Bausteinen. Lehrkräfte schreiben neue
 * Arbeitsblätter als einfache TypeScript-Datei (siehe
 * src/lessons/federpendel/arbeitsblatt.ts). Später kann daraus ein Editor
 * werden, das Datenformat bleibt dasselbe (reines JSON-kompatibles Objekt).
 */
export interface Worksheet {
  title: string;
  /** z. B. "Klasse 10 · Mechanik" */
  subtitle?: string;
  blocks: Block[];
}

export type Block = HeadingBlock | TextBlock | QuestionBlock | TableBlock | ChoiceBlock | SnapshotBlock;

export interface HeadingBlock {
  type: 'heading';
  text: string;
}

/** Erklärtext. Absätze mit Leerzeile trennen, **fett** ist erlaubt. */
export interface TextBlock {
  type: 'text';
  text: string;
}

/** Freitext-Antwort */
export interface QuestionBlock {
  type: 'question';
  id: string;
  prompt: string;
  /** Höhe des Antwortfelds in Zeilen */
  lines?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  unit?: string;
  /**
   * Schlüssel eines Messwerts der Simulation. Ist er gesetzt, füllt
   * „Messwerte übernehmen“ diese Spalte automatisch.
   */
  source?: string;
}

/** Wertetabelle, Zeilen per Hand oder aus der Simulation füllbar */
export interface TableBlock {
  type: 'table';
  id: string;
  prompt?: string;
  columns: TableColumn[];
  rows: number;
}

export interface ChoiceBlock {
  type: 'choice';
  id: string;
  prompt: string;
  options: string[];
  multiple?: boolean;
}

/** Bild der Simulation einfügen (z. B. ein Diagramm oder eine Bahnkurve) */
export interface SnapshotBlock {
  type: 'snapshot';
  id: string;
  prompt: string;
}

/** Antworten der Schülerin/des Schülers. Lebt nur im Arbeitsspeicher. */
export interface Answers {
  name: string;
  klasse: string;
  datum: string;
  text: Record<string, string>;
  tables: Record<string, string[][]>;
  choices: Record<string, number[]>;
  snapshots: Record<string, string | null>;
}

export function emptyAnswers(ws: Worksheet): Answers {
  const a: Answers = {
    name: '',
    klasse: '',
    datum: new Date().toLocaleDateString('de-DE'),
    text: {},
    tables: {},
    choices: {},
    snapshots: {}
  };
  for (const b of ws.blocks) {
    if (b.type === 'question') a.text[b.id] = '';
    if (b.type === 'table') a.tables[b.id] = Array.from({ length: b.rows }, () => b.columns.map(() => ''));
    if (b.type === 'choice') a.choices[b.id] = [];
    if (b.type === 'snapshot') a.snapshots[b.id] = null;
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
