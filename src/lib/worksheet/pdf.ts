/**
 * PDF-Export eines ausgefüllten Arbeitsblatts – komplett im Browser.
 * Es wird nichts an einen Server geschickt und nichts gespeichert.
 * jsPDF wird erst beim Klick nachgeladen, damit die Simulation schnell startet.
 */
import { isTask, taskNumbers, type Answers, type Worksheet } from './types';
import { paragraphs, plain } from './richtext';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LINE = 5.2;

/**
 * Die eingebauten PDF-Schriften kennen nur den westeuropäischen Zeichensatz.
 * Umlaute und ß sind enthalten; griechische Buchstaben und Indizes werden
 * ersetzt, damit im PDF keine Fragezeichen erscheinen.
 */
const REPLACE: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', Δ: 'Delta', ω: 'omega', φ: 'phi', π: 'pi',
  λ: 'lambda', μ: 'µ', ρ: 'rho', σ: 'sigma', τ: 'tau', θ: 'theta', '√': 'Wurzel ',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', 'ₓ': 'x', 'ᵧ': 'y', 'ŝ': 's^', ϑ: 'theta', η: 'eta', Ω: 'Ohm', '′': "'", '„': '"', '“': '"', '≈': '~', '≤': '<=', '≥': '>=',
  '→': '->', '⋅': '·', '−': '-', '⅒': '1/10'
};
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

export function pdfSafe(s: string): string {
  let out = '';
  for (const ch of s) {
    if (REPLACE[ch] !== undefined) out += REPLACE[ch];
    else if (ch.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.has(ch)) out += ch;
    else out += '?';
  }
  return out;
}

export async function exportWorksheetPdf(ws: Worksheet, a: Answers, withSolutions = false): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > PAGE_H - MARGIN - 6) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const font = (size: number, style: 'normal' | 'bold' | 'italic' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };
  const write = (text: string, size = 10.5, style: 'normal' | 'bold' | 'italic' = 'normal', indent = 0) => {
    font(size, style);
    const lines: string[] = doc.splitTextToSize(pdfSafe(text), CONTENT_W - indent);
    for (const l of lines) {
      ensure(LINE);
      doc.text(l, MARGIN + indent, y + 3.8);
      y += LINE;
    }
  };

  // Kopf
  font(17, 'bold');
  doc.text(pdfSafe(ws.title), MARGIN, y + 6);
  y += 9;
  if (ws.subtitle) {
    font(10.5);
    doc.setTextColor(90);
    doc.text(pdfSafe(ws.subtitle), MARGIN, y + 3.8);
    doc.setTextColor(0);
    y += 6;
  }
  y += 2;
  const fields: [string, string, number][] = [
    ['Name', a.name, 80],
    ['Klasse', a.klasse, 35],
    ['Datum', a.datum, 0]
  ];
  let fx = MARGIN;
  for (const [lab, val, w] of fields) {
    font(9, 'normal');
    doc.setTextColor(100);
    doc.text(lab, fx, y + 3);
    doc.setTextColor(0);
    font(11, 'normal');
    doc.text(pdfSafe(val || ''), fx, y + 8.5);
    const width = w || PAGE_W - MARGIN - fx;
    doc.setDrawColor(150);
    doc.line(fx, y + 10, fx + width - 4, y + 10);
    fx += w;
  }
  y += 16;

  const numbers = taskNumbers(ws);
  /** Aufgabenstellung mit laufender Nummer */
  const head = (bi: number, prompt: string) => `${numbers[bi]}  ${plain(prompt)}`;
  const image = (img: string, maxW: number) => {
    const props = doc.getImageProperties(img);
    const w = Math.min(CONTENT_W, maxW);
    const h = (w * props.height) / props.width;
    ensure(h + 2);
    doc.setDrawColor(190);
    doc.addImage(img, 'PNG', MARGIN, y + 1, w, h);
    doc.rect(MARGIN, y + 1, w, h, 'S');
    y += h + 5;
  };
  const answerBox = (ans: string, emptyLines: number) => {
    font(10.5);
    const lines: string[] = ans ? doc.splitTextToSize(pdfSafe(ans), CONTENT_W - 6) : [];
    const n = Math.max(lines.length, ans ? 1 : emptyLines);
    ensure(Math.min(n * LINE + 4, 60));
    const top = y + 1;
    doc.setDrawColor(190);
    if (ans) {
      let ly = top + 2;
      for (const l of lines) {
        if (ly + LINE > PAGE_H - MARGIN - 6) {
          doc.addPage();
          ly = MARGIN;
        }
        doc.text(l, MARGIN + 3, ly + 3.8);
        ly += LINE;
      }
      y = ly + 2;
      if (lines.length * LINE < 60) doc.roundedRect(MARGIN, top, CONTENT_W, y - top, 1.5, 1.5, 'S');
    } else {
      for (let i = 1; i <= n; i++) doc.line(MARGIN, top + i * 7, MARGIN + CONTENT_W, top + i * 7);
      y = top + n * 7 + 2;
    }
    y += 3;
  };

  for (const [bi, b] of ws.blocks.entries()) {
    switch (b.type) {
      case 'heading':
        y += 2;
        ensure(12);
        write(b.text, 13, 'bold');
        y += 1;
        break;

      case 'text':
        for (const p of paragraphs(b.text)) {
          write(p.map((s) => s.text).join(''));
          y += 1.5;
        }
        break;

      case 'question':
        ensure(LINE * 2 + 16); // Frage nicht allein am Seitenende
        write(head(bi, b.prompt), 10.5, 'bold');
        answerBox(a.text[b.id]?.trim() ?? '', b.lines ?? 3);
        break;

      case 'chart': {
        ensure(LINE * 2 + 50);
        write(head(bi, b.prompt), 10.5, 'bold');
        const img = a.charts[b.id];
        if (img) image(img, 130);
        else {
          write('(Diagramm ohne Messwerte)', 10, 'italic');
          y += 2;
        }
        answerBox(a.text[b.id]?.trim() ?? '', 3);
        break;
      }

      case 'table': {
        ensure(LINE + 7 * 3);
        write(head(bi, b.prompt), 10.5, 'bold');
        const rows = a.tables[b.id] ?? [];
        const cw = CONTENT_W / b.columns.length;
        const rh = 7;
        const plain = (s: string) => s.replace(/_\{?([^}\s]+)\}?/g, '$1');
        const header = b.columns.map((c) => (c.unit ? `${plain(c.label)} in ${c.unit}` : plain(c.label)));
        ensure(rh * 2 + 2);
        y += 1;
        const drawRow = (cells: string[], head: boolean) => {
          ensure(rh);
          if (head) {
            doc.setFillColor(236, 240, 245);
            doc.rect(MARGIN, y, CONTENT_W, rh, 'F');
          }
          doc.setDrawColor(170);
          font(9.5, head ? 'bold' : 'normal');
          cells.forEach((c, i) => {
            doc.rect(MARGIN + i * cw, y, cw, rh, 'S');
            const t: string = doc.splitTextToSize(pdfSafe(c), cw - 3)[0] ?? '';
            doc.text(t, MARGIN + i * cw + cw / 2, y + 4.8, { align: 'center' });
          });
          y += rh;
        };
        drawRow(header, true);
        for (const r of rows) drawRow(r, false);
        y += 4;
        break;
      }

      case 'choice': {
        ensure(LINE * 2 + 10);
        write(head(bi, b.prompt), 10.5, 'bold');
        const chosen = a.choices[b.id] ?? [];
        b.options.forEach((o, i) => {
          font(10.5);
          const lines: string[] = doc.splitTextToSize(pdfSafe(o), CONTENT_W - 9);
          ensure(lines.length * LINE);
          doc.setDrawColor(90);
          doc.rect(MARGIN + 1, y + 1, 3.6, 3.6, 'S');
          if (chosen.includes(i)) {
            doc.setLineWidth(0.5);
            doc.line(MARGIN + 1.6, y + 2.9, MARGIN + 2.6, y + 4);
            doc.line(MARGIN + 2.6, y + 4, MARGIN + 4.2, y + 1.4);
            doc.setLineWidth(0.2);
          }
          lines.forEach((l, j) => doc.text(l, MARGIN + 7, y + 3.8 + j * LINE));
          y += lines.length * LINE + 0.8;
        });
        y += 3;
        break;
      }

      case 'snapshot': {
        write(head(bi, b.prompt), 10.5, 'bold');
        const img = a.snapshots[b.id];
        if (img) image(img, 140);
        else {
          write('(kein Bild eingefügt)', 10, 'italic');
          y += 3;
        }
        break;
      }
    }

    if (withSolutions && isTask(b)) {
      const parts: string[] = [];
      if (b.type === 'choice' && b.correct?.length) parts.push(`Richtig: ${b.correct.map((i) => b.options[i]).join(' / ')}`);
      if (b.solution) parts.push(plain(b.solution));
      if (parts.length) {
        doc.setTextColor(14, 90, 75);
        write(`Erwartungshorizont: ${parts.join(' ')}`, 9.5, 'italic', 4);
        doc.setTextColor(0);
        y += 3;
      }
    }
  }

  // Fußzeile
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(8.5);
    doc.setTextColor(130);
    doc.text(pdfSafe(`${ws.title} · ${a.name || 'ohne Namen'}`), MARGIN, PAGE_H - 9);
    doc.text(`Seite ${i} von ${pages}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
    doc.setTextColor(0);
  }

  const safe = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  const file = [withSolutions ? 'Erwartungshorizont' : 'Arbeitsblatt', safe(ws.title), safe(a.name)].filter(Boolean).join('_');
  doc.save(`${file}.pdf`);
}
