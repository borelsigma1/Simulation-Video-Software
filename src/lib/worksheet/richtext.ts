/** Minimaler, sicherer Textsatz: Absätze (Leerzeile) und **fett**. Kein HTML. */
export interface Segment {
  text: string;
  bold: boolean;
}

export function paragraphs(src: string): Segment[][] {
  return src
    .trim()
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/\s*\n\s*/g, ' ')
        .split(/(\*\*[^*]+\*\*)/)
        .filter(Boolean)
        .map((s) => (s.startsWith('**') && s.endsWith('**') ? { text: s.slice(2, -2), bold: true } : { text: s, bold: false }))
    );
}

export function plain(src: string): string {
  return src.replace(/\*\*/g, '');
}
