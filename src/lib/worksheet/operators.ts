/**
 * Operatoren für Aufgabenstellungen.
 *
 * Grundlage ist der „Grundstock von Operatoren“ für die naturwissenschaftlichen
 * Fächer (gemeinsamer Abituraufgabenpool der Länder, veröffentlicht vom ISB
 * Bayern, Stand 31.03.2022). Die Beschreibungen sind für Schülerinnen und
 * Schüler knapp gefasst. „bestimmen“ steht nicht in dieser Liste, ist im
 * Unterricht aber üblich und wird wie „ermitteln“ verstanden.
 */
export interface Operator {
  key: string;
  /** Nennform, z. B. "beschreiben" */
  name: string;
  /** So beginnt die Aufgabe, z. B. "Beschreibe" oder "Gib … an" */
  start: string;
  /** Was erwartet wird */
  meaning: string;
  /** Anforderungsbereich, in dem der Operator überwiegend liegt */
  afb: 'I' | 'II' | 'III';
}

export const OPERATORS: Operator[] = [
  { key: 'nennen', name: 'nennen', start: 'Nenne', afb: 'I', meaning: 'Formeln, Regeln, Sachverhalte, Begriffe oder Daten ohne Erläuterung aufzählen bzw. wiedergeben.' },
  { key: 'angeben', name: 'angeben', start: 'Gib … an', afb: 'I', meaning: 'Formeln, Regeln, Sachverhalte, Begriffe oder Daten ohne Erläuterung aufzählen bzw. wiedergeben.' },
  { key: 'beschreiben', name: 'beschreiben', start: 'Beschreibe', afb: 'I', meaning: 'Beobachtungen, Strukturen, Sachverhalte oder Zusammenhänge strukturiert und mit Fachsprache formulieren.' },
  { key: 'skizzieren', name: 'skizzieren', start: 'Skizziere', afb: 'I', meaning: 'Sachverhalte, Prozesse, Strukturen oder Ergebnisse übersichtlich grafisch darstellen.' },
  { key: 'zeichnen', name: 'zeichnen', start: 'Zeichne', afb: 'I', meaning: 'Objekte grafisch exakt darstellen.' },
  { key: 'darstellen', name: 'darstellen', start: 'Stelle … dar', afb: 'II', meaning: 'Strukturen, Sachverhalte oder Zusammenhänge strukturiert und mit Fachsprache formulieren, auch mit Zeichnungen und Tabellen.' },
  { key: 'berechnen', name: 'berechnen', start: 'Berechne', afb: 'II', meaning: 'Die Berechnung ist ausgehend von einem Ansatz darzustellen.' },
  { key: 'ermitteln', name: 'ermitteln', start: 'Ermittle', afb: 'II', meaning: 'Ein Ergebnis oder einen Zusammenhang rechnerisch, grafisch oder experimentell bestimmen.' },
  { key: 'bestimmen', name: 'bestimmen', start: 'Bestimme', afb: 'II', meaning: 'Ein Ergebnis oder einen Zusammenhang rechnerisch, grafisch oder experimentell bestimmen (wie „ermitteln“).' },
  { key: 'abschaetzen', name: 'abschätzen', start: 'Schätze … ab', afb: 'II', meaning: 'Durch begründete Überlegungen Größenwerte angeben.' },
  { key: 'auswerten', name: 'auswerten', start: 'Werte … aus', afb: 'II', meaning: 'Beobachtungen, Daten oder Informationen in einen Zusammenhang stellen und Schlussfolgerungen daraus ziehen.' },
  { key: 'vergleichen', name: 'vergleichen', start: 'Vergleiche', afb: 'II', meaning: 'Gemeinsamkeiten und Unterschiede kriteriengeleitet herausarbeiten.' },
  { key: 'ordnen', name: 'ordnen', start: 'Ordne', afb: 'II', meaning: 'Begriffe oder Gegenstände auf der Grundlage bestimmter Merkmale systematisch einteilen.' },
  { key: 'untersuchen', name: 'untersuchen', start: 'Untersuche', afb: 'II', meaning: 'Sachverhalte oder Phänomene mithilfe fachspezifischer Arbeitsweisen erschließen.' },
  { key: 'analysieren', name: 'analysieren', start: 'Analysiere', afb: 'II', meaning: 'Wichtige Bestandteile, Eigenschaften oder Zusammenhänge auf eine bestimmte Fragestellung hin herausarbeiten.' },
  { key: 'erklaeren', name: 'erklären', start: 'Erkläre', afb: 'II', meaning: 'Einen Sachverhalt nachvollziehbar und verständlich machen, indem man ihn auf Regeln und Gesetzmäßigkeiten zurückführt.' },
  { key: 'erlaeutern', name: 'erläutern', start: 'Erläutere', afb: 'II', meaning: 'Einen Sachverhalt veranschaulichend darstellen und durch zusätzliche Informationen verständlich machen.' },
  { key: 'begruenden', name: 'begründen', start: 'Begründe', afb: 'II', meaning: 'Gründe oder Argumente für eine Vorgehensweise oder einen Sachverhalt nachvollziehbar darstellen.' },
  { key: 'ableiten', name: 'ableiten', start: 'Leite … ab', afb: 'II', meaning: 'Auf der Grundlage von Erkenntnissen oder Daten sachgerechte Schlüsse ziehen.' },
  { key: 'herleiten', name: 'herleiten', start: 'Leite … her', afb: 'II', meaning: 'Mithilfe bekannter Gesetzmäßigkeiten einen Zusammenhang zwischen physikalischen Größen herstellen.' },
  { key: 'deuten', name: 'deuten / interpretieren', start: 'Deute', afb: 'III', meaning: 'Ergebnisse, Beschreibungen und Annahmen vor dem Hintergrund einer Fragestellung oder Hypothese in einen nachvollziehbaren Zusammenhang bringen.' },
  { key: 'hypothese', name: 'Hypothese aufstellen', start: 'Stelle eine Hypothese auf', afb: 'III', meaning: 'Eine Vermutung über einen unbekannten Sachverhalt formulieren, die fachlich fundiert begründet wird.' },
  { key: 'planen', name: 'planen', start: 'Plane', afb: 'III', meaning: 'Zu einem vorgegebenen Problem (auch experimentelle) Lösungswege entwickeln und dokumentieren.' },
  { key: 'beurteilen', name: 'beurteilen', start: 'Beurteile', afb: 'III', meaning: 'Das zu fällende Sachurteil ist mithilfe fachlicher Kriterien zu begründen.' },
  { key: 'bewerten', name: 'bewerten', start: 'Bewerte', afb: 'III', meaning: 'Das zu fällende Werturteil ist unter Berücksichtigung gesellschaftlicher Werte und Normen zu begründen.' },
  { key: 'diskutieren', name: 'diskutieren', start: 'Diskutiere', afb: 'III', meaning: 'Argumente zu einer Aussage oder These einander gegenüberstellen und abwägen.' }
];

export const operatorByKey = (key: string | undefined): Operator | undefined =>
  key ? OPERATORS.find((o) => o.key === key) : undefined;

/**
 * Sucht das Operator-Wort in der Aufgabenstellung, damit es hervorgehoben
 * werden kann: "Lies ab. Beschreibe, was …" -> ["Lies ab. ", "Beschreibe", ", was …"].
 * Kommt das Wort nicht vor, ist der mittlere Teil leer.
 */
export function splitOperator(prompt: string, op: Operator | undefined): [string, string, string] {
  if (!op) return ['', '', prompt];
  const first = op.start.split(' ')[0];
  const m = new RegExp(`(^|[^\\p{L}])(${first})(?![\\p{L}])`, 'iu').exec(prompt);
  if (!m) return ['', '', prompt];
  const at = m.index + m[1].length;
  return [prompt.slice(0, at), m[2], prompt.slice(at + first.length)];
}
