/**
 * PDF-Export eines ausgefüllten Arbeitsblatts – komplett im Browser.
 * Es wird nichts an einen Server geschickt und nichts gespeichert.
 *
 * Das Blatt wird zuerst unsichtbar als HTML im Stil der Webseite gesetzt
 * (gleiche Schriften, Farben, Rahmen, Formelsatz mit KaTeX). Danach zeichnet
 * `renderPdf` alles, was der Browser dort angeordnet hat, als Vektor-PDF nach:
 * Wörter mit eingebetteten Schriften, Flächen, Rahmen, Bilder und SVG-Teile
 * der Formeln. So sehen Bildschirm und Ausdruck gleich aus.
 *
 * Dieses Modul wird erst beim Klick auf „PDF“ nachgeladen.
 */
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { labelText, mathHtml, tex, unitTex } from '../tex/tex';
import { paragraphs } from './richtext';
import { isTask, taskNumbers, type Answers, type Block, type Worksheet } from './types';

import atkRegular from './pdf-fonts/Atkinson-Regular.ttf?url';
import atkBold from './pdf-fonts/Atkinson-Bold.ttf?url';
import atkItalic from './pdf-fonts/Atkinson-Italic.ttf?url';
import bricoBold from './pdf-fonts/Bricolage-Bold.ttf?url';
import monoMedium from './pdf-fonts/JetBrainsMono-Medium.ttf?url';
import kMain from 'katex/dist/fonts/KaTeX_Main-Regular.ttf?url';
import kMainBold from 'katex/dist/fonts/KaTeX_Main-Bold.ttf?url';
import kMainItalic from 'katex/dist/fonts/KaTeX_Main-Italic.ttf?url';
import kMathItalic from 'katex/dist/fonts/KaTeX_Math-Italic.ttf?url';
import kAms from 'katex/dist/fonts/KaTeX_AMS-Regular.ttf?url';
import kSize1 from 'katex/dist/fonts/KaTeX_Size1-Regular.ttf?url';
import kSize2 from 'katex/dist/fonts/KaTeX_Size2-Regular.ttf?url';
import kSize3 from 'katex/dist/fonts/KaTeX_Size3-Regular.ttf?url';
import kSize4 from 'katex/dist/fonts/KaTeX_Size4-Regular.ttf?url';

// ---------------------------------------------------------------- Seite

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 18; // Rand links/rechts in mm
const TOP = 15; // oberer Rand
const BOTTOM = 280; // unterste Zeile des Inhalts; darunter die Fußzeile
const CSS_W = 660; // Satzbreite des HTML-Blatts in px
const S = (PAGE_W - 2 * MX) / CSS_W; // mm pro px
const PT = S / 0.352778; // pt pro px

// ---------------------------------------------------------------- Schriften

/** Name im PDF → Datei. Jede Datei wird unter genau einem Namen mit Stil „normal“ angemeldet. */
const FONTS: Record<string, string> = {
  atk: atkRegular,
  atkB: atkBold,
  atkI: atkItalic,
  brico: bricoBold,
  mono: monoMedium,
  kMain: kMain,
  kMainB: kMainBold,
  kMainI: kMainItalic,
  kMath: kMathItalic,
  kAms: kAms,
  kSize1: kSize1,
  kSize2: kSize2,
  kSize3: kSize3,
  kSize4: kSize4
};

let fontData: Promise<Record<string, string>> | null = null;

function base64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function loadFonts(): Promise<Record<string, string>> {
  fontData ??= Promise.all(
    Object.entries(FONTS).map(async ([name, url]) => [name, base64(await (await fetch(url)).arrayBuffer())] as const)
  ).then((list) => Object.fromEntries(list));
  return fontData;
}

/** Berechneter CSS-Schriftstil → Name der eingebetteten Schrift. */
function pdfFont(cs: CSSStyleDeclaration): string {
  const fam = cs.fontFamily;
  const bold = parseInt(cs.fontWeight, 10) >= 600;
  const italic = cs.fontStyle === 'italic';
  if (fam.includes('KaTeX_Math')) return 'kMath';
  if (fam.includes('KaTeX_AMS')) return 'kAms';
  const size = /KaTeX_Size(\d)/.exec(fam);
  if (size) return `kSize${size[1]}`;
  if (fam.includes('KaTeX')) return bold ? 'kMainB' : italic ? 'kMainI' : 'kMain';
  if (fam.includes('Bricolage')) return 'brico';
  if (fam.includes('JetBrains')) return 'mono';
  return bold ? 'atkB' : italic ? 'atkI' : 'atk';
}

// ---------------------------------------------------------------- HTML-Blatt

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const runHtml = mathHtml;

/** Inhaltstext mit **fett** und $Formeln$; inline = ohne <p>. */
function richHtml(src: string, inline = false): string {
  const paras = paragraphs(src).map((p) => p.map((s) => (s.bold ? `<strong>${runHtml(s.text)}</strong>` : runHtml(s.text))).join(''));
  return inline ? paras.join(' ') : paras.map((p) => `<p>${p}</p>`).join('');
}

const CHECK = '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M2 5.3 4.2 7.5 8.2 2.6" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const SHEET_CSS = `
.ps{position:fixed;left:-20000px;top:0;width:${CSS_W}px;color:#1b2433;
  font-family:'Atkinson Hyperlegible Next Variable',sans-serif;font-size:14.5px;line-height:1.5;font-weight:400}
.ps *{box-sizing:border-box;margin:0;padding:0}
.ps p + p{margin-top:7px}
.ps strong{font-weight:700}
.ps .katex{font-size:1.06em}
.ps-band{background:#12372f;color:#f3efe2;border-radius:5px;padding:14px 18px 16px;box-shadow:3px 3px 0 #d2c9b5}
.ps-kicker{font-family:'JetBrains Mono Variable',monospace;font-weight:500;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#b9c9bd}
.ps-title{font-family:'Bricolage Grotesque Variable',sans-serif;font-weight:700;font-size:25px;line-height:1.15;margin-top:5px}
.ps-fields{display:flex;gap:18px;margin:16px 0 4px}
.ps-field{display:flex;align-items:baseline;gap:8px;border-bottom:1.5px solid #1b2433;padding-bottom:3px;min-height:27px}
.ps-field span{font-family:'JetBrains Mono Variable',monospace;font-weight:500;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#69717e}
.ps-field b{font-weight:400;font-size:14.5px}
.ps-g{padding-top:14px}
.ps-h{display:flex;align-items:center;gap:12px;font-family:'Bricolage Grotesque Variable',sans-serif;font-weight:700;font-size:18px;line-height:1.25;padding-top:6px;margin-bottom:8px}
.ps-h i{flex:1;border-top:1.5px solid #1b2433;height:0}
.ps-text{color:#1b2433}
.ps-task{display:grid;grid-template-columns:26px 1fr;column-gap:6px}
.ps-num{font-family:'Bricolage Grotesque Variable',sans-serif;font-weight:700;font-size:21px;line-height:1.05;color:#e2452b;padding-top:1px}
.ps-prompt{font-weight:700;line-height:1.45}
.ps-ans{margin-top:8px;border:1.5px solid #1b2433;border-radius:5px;padding:4px 12px 6px;white-space:pre-wrap;min-height:34px}
.ps-ans.empty{padding:0 12px 4px}
.ps-rule{height:28px;border-bottom:1px solid #d2c9b5}
.ps-rule:last-child{border-bottom:0}
.ps-tw{margin-top:9px;border:1.5px solid #1b2433;border-radius:5px;overflow:hidden}
.ps table{border-collapse:collapse;width:100%}
.ps th,.ps td{border-left:1px solid #d2c9b5;border-top:1px solid #d2c9b5;text-align:center;height:27px;padding:2px 6px;font-size:13.5px}
.ps th{background:#f8f4ea;font-weight:400;border-top:0}
.ps th:first-child,.ps td:first-child{border-left:0;width:40px;font-family:'JetBrains Mono Variable',monospace;font-weight:500;font-size:11px;color:#69717e}
.ps th .u{color:#69717e}
.ps-opt{display:flex;gap:10px;align-items:flex-start;margin-top:6px}
.ps-box{flex:none;width:15px;height:15px;margin-top:3px;border:1.5px solid #1b2433;border-radius:3px;display:flex;align-items:center;justify-content:center}
.ps-box.on{background:#e2452b;border-color:#b9321c}
.ps-img{display:block;margin-top:9px;border:1.5px solid #1b2433;border-radius:5px;max-width:100%}
.ps-none{margin-top:6px;color:#69717e;font-style:italic}
.ps-sol{margin-top:9px;background:#dcebe4;border-left:4px solid #0e5a4b;border-radius:4px;padding:7px 12px 8px;font-size:13.5px}
.ps-sol .k{display:block;font-family:'JetBrains Mono Variable',monospace;font-weight:500;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#0e5a4b;margin-bottom:2px}
`;

function taskBody(b: Block, a: Answers, withSolutions: boolean): string {
  if (!isTask(b)) return '';
  let h = `<div class="ps-prompt">${richHtml(b.prompt, true)}</div>`;
  switch (b.type) {
    case 'question': {
      const ans = a.text[b.id]?.trim() ?? '';
      h += ans
        ? `<div class="ps-ans">${esc(ans)}</div>`
        : `<div class="ps-ans empty">${'<div class="ps-rule"></div>'.repeat(b.lines ?? 3)}</div>`;
      break;
    }
    case 'table': {
      const rows = a.tables[b.id] ?? [];
      const head = b.columns
        .map((c) => `<th>${richHtml(labelText(c.label), true)}${c.unit ? `<span class="u"> in ${tex(unitTex(c.unit))}</span>` : ''}</th>`)
        .join('');
      const body = rows.map((r, i) => `<tr class="ps-cut"><td>${i + 1}</td>${b.columns.map((_, ci) => `<td>${esc(r[ci] ?? '')}</td>`).join('')}</tr>`).join('');
      h += `<div class="ps-tw"><table><tr><th>Nr.</th>${head}</tr>${body}</table></div>`;
      break;
    }
    case 'choice': {
      const chosen = a.choices[b.id] ?? [];
      h += b.options
        .map((o, i) => `<div class="ps-opt ps-cut"><span class="ps-box${chosen.includes(i) ? ' on' : ''}">${chosen.includes(i) ? CHECK : ''}</span><span>${richHtml(o, true)}</span></div>`)
        .join('');
      break;
    }
    case 'chart': {
      const img = a.charts[b.id];
      h += img ? `<img class="ps-img" src="${img}" style="width:440px">` : '<div class="ps-none">(Diagramm ohne Messwerte)</div>';
      const ans = a.text[b.id]?.trim() ?? '';
      h += ans ? `<div class="ps-ans">${esc(ans)}</div>` : `<div class="ps-ans empty">${'<div class="ps-rule"></div>'.repeat(3)}</div>`;
      break;
    }
    case 'snapshot': {
      const img = a.snapshots[b.id];
      h += img ? `<img class="ps-img" src="${img}" style="width:500px">` : '<div class="ps-none">(kein Bild eingefügt)</div>';
      break;
    }
  }
  if (withSolutions) {
    const parts: string[] = [];
    if (b.type === 'choice' && b.correct?.length) parts.push(`Richtig: ${b.correct.map((i) => richHtml(b.options[i], true)).join(' / ')}`);
    if (b.solution) parts.push(richHtml(b.solution, true));
    if (parts.length) h += `<div class="ps-sol"><span class="k">Erwartungshorizont</span>${parts.join(' ')}</div>`;
  }
  return h;
}

/** Das Blatt als HTML; jede Gruppe (data-g) wird möglichst nicht über eine Seitengrenze getrennt. */
function sheetHtml(ws: Worksheet, a: Answers, withSolutions: boolean): string {
  const numbers = taskNumbers(ws);
  const kicker = ['Arbeitsblatt', ws.subtitle].filter(Boolean).join(' · ') + (withSolutions ? ' · Erwartungshorizont' : '');
  let h = `<div class="ps-g" data-g style="padding-top:0"><div class="ps-band"><div class="ps-kicker">${esc(kicker)}</div><div class="ps-title">${richHtml(ws.title, true)}</div></div>
    <div class="ps-fields"><div class="ps-field" style="flex:1.6"><span>Name</span><b>${esc(a.name || '')}</b></div><div class="ps-field" style="flex:.7"><span>Klasse</span><b>${esc(a.klasse || '')}</b></div><div class="ps-field" style="flex:.9"><span>Datum</span><b>${esc(a.datum || '')}</b></div></div></div>`;
  let pending = '';
  for (const [bi, b] of ws.blocks.entries()) {
    if (b.type === 'heading') {
      pending += `<div class="ps-h"><span>${richHtml(b.text, true)}</span><i></i></div>`;
      continue;
    }
    const inner =
      b.type === 'text' ? `<div class="ps-text">${richHtml(b.text)}</div>` : `<div class="ps-task"><div class="ps-num">${numbers[bi]}</div><div>${taskBody(b, a, withSolutions)}</div></div>`;
    h += `<div class="ps-g" data-g>${pending}${inner}</div>`;
    pending = '';
  }
  if (pending) h += `<div class="ps-g" data-g>${pending}</div>`;
  return h;
}

// ---------------------------------------------------------------- HTML → PDF

interface Prim {
  top: number;
  bottom: number;
  /** Textzeile: Seitenumbruch an ihrer Unterkante ist erlaubt */
  line?: boolean;
  draw(doc: jsPDF, y: (px: number) => number): void | Promise<void>;
}

type RGBA = [number, number, number, number];
function color(c: string): RGBA | null {
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) return null;
  const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  const rgba: RGBA = [v[0], v[1], v[2], v[3] ?? 1];
  return rgba[3] <= 0.01 ? null : rgba;
}
/** Halbtransparente Farben auf Papierweiß vorrechnen */
const solid = ([r, g, b, al]: RGBA): [number, number, number] => [r * al + 255 * (1 - al), g * al + 253 * (1 - al), b * al + 247 * (1 - al)];
const px = (v: string) => parseFloat(v) || 0;

function collect(root: HTMLElement): Prim[] {
  const R = root.getBoundingClientRect();
  const X = (v: number) => MX + (v - R.left) * S;
  const prims: Prim[] = [];

  const box = (el: Element, cs: CSSStyleDeclaration) => {
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.2) return;
    const bg = color(cs.backgroundColor);
    const rad = Math.min(px(cs.borderTopLeftRadius), r.width / 2, r.height / 2) * S;
    const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).map((s) => ({
      w: cs.getPropertyValue(`border-${s.toLowerCase()}-style`) === 'none' ? 0 : px(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)),
      c: color(cs.getPropertyValue(`border-${s.toLowerCase()}-color`))
    }));
    const shadow = /(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(cs.boxShadow);
    const any = bg || sides.some((s) => s.w > 0 && s.c) || shadow;
    if (!any) return;
    prims.push({
      top: r.top - R.top,
      bottom: r.bottom - R.top + (shadow ? px(shadow[3]) : 0),
      draw(doc, y) {
        const x0 = X(r.left);
        const y0 = y(r.top - R.top);
        const w = r.width * S;
        const h = r.height * S;
        if (shadow) {
          const sc = color(shadow[1]);
          if (sc) {
            doc.setFillColor(...solid(sc));
            doc.roundedRect(x0 + px(shadow[2]) * S, y0 + px(shadow[3]) * S, w, h, rad, rad, 'F');
          }
        }
        if (bg) {
          doc.setFillColor(...solid(bg));
          if (rad > 0) doc.roundedRect(x0, y0, w, h, rad, rad, 'F');
          else doc.rect(x0, y0, w, h, 'F');
        }
        const uniform = sides.every((s) => s.w === sides[0].w && s.c && sides[0].c && s.c.join() === sides[0].c.join());
        if (uniform && sides[0].w > 0) {
          const bw = sides[0].w * S;
          doc.setDrawColor(...solid(sides[0].c!));
          doc.setLineWidth(bw);
          if (rad > 0) doc.roundedRect(x0 + bw / 2, y0 + bw / 2, w - bw, h - bw, Math.max(rad - bw / 2, 0), Math.max(rad - bw / 2, 0), 'S');
          else doc.rect(x0 + bw / 2, y0 + bw / 2, w - bw, h - bw, 'S');
          return;
        }
        sides.forEach((s, i) => {
          if (!(s.w > 0 && s.c)) return;
          const bw = s.w * S;
          doc.setFillColor(...solid(s.c));
          if (i === 0) doc.rect(x0, y0, w, bw, 'F');
          if (i === 1) doc.rect(x0 + w - bw, y0, bw, h, 'F');
          if (i === 2) doc.rect(x0, y0 + h - bw, w, bw, 'F');
          if (i === 3) doc.rect(x0, y0, bw, h, 'F');
        });
      }
    });
  };

  /** Abstand Oberkante Textrechteck → Grundlinie; hängt nur von der Schrift ab. */
  const baselines = new Map<string, number>();
  const baselineOffset = (cs: CSSStyleDeclaration): number => {
    const key = [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontStyle].join('|');
    let off = baselines.get(key);
    if (off === undefined) {
      const probe = document.createElement('span');
      probe.style.cssText = `font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};line-height:normal;white-space:nowrap`;
      const t = document.createTextNode('Hg');
      const mark = document.createElement('span');
      mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      probe.append(t, mark);
      root.appendChild(probe);
      const rg = document.createRange();
      rg.selectNodeContents(t);
      off = mark.getBoundingClientRect().bottom - rg.getBoundingClientRect().top;
      probe.remove();
      baselines.set(key, off);
    }
    return off;
  };

  const text = (node: Text) => {
    const parent = node.parentElement!;
    const cs = getComputedStyle(parent);
    if (cs.visibility === 'hidden') return;
    const content = node.data;
    const words = [...content.matchAll(/\S+/g)];
    if (!words.length) return;
    const range = document.createRange();
    const rectOf = (m: RegExpMatchArray) => {
      range.setStart(node, m.index!);
      range.setEnd(node, m.index! + m[0].length);
      // Chrome liefert am Zeilenanfang oft zusätzlich ein leeres Rechteck am Ende der vorigen Zeile
      let best: DOMRect | null = null;
      for (const r of range.getClientRects()) if (!best || r.width > best.width) best = r;
      return best ?? range.getBoundingClientRect();
    };
    const off = baselineOffset(cs);
    const font = pdfFont(cs);
    const size = px(cs.fontSize) * PT;
    const c = color(cs.color) ?? [27, 36, 51, 1];
    const spacing = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing) * S;
    const upper = cs.textTransform === 'uppercase';
    for (const m of words) {
      const r = rectOf(m);
      if (r.width === 0 && r.height === 0) continue;
      const word = upper ? m[0].toUpperCase() : m[0];
      prims.push({
        top: r.top - R.top,
        bottom: r.bottom - R.top,
        line: true,
        draw(doc, y) {
          doc.setFont(font, 'normal');
          doc.setFontSize(size);
          doc.setTextColor(...solid(c));
          doc.text(word, X(r.left), y(r.top - R.top + off), { baseline: 'alphabetic', charSpace: spacing });
        }
      });
    }
  };

  const svg = (el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) return;
    // sichtbarer Ausschnitt (KaTeX schneidet die sehr breiten Wurzel-SVGs per overflow ab)
    let clip = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') {
        const q = p.getBoundingClientRect();
        clip = { l: Math.max(clip.l, q.left), t: Math.max(clip.t, q.top), r: Math.min(clip.r, q.right), b: Math.min(clip.b, q.bottom) };
      }
    }
    const fill = color(getComputedStyle(el).color) ?? [27, 36, 51, 1];
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(r.width));
    clone.setAttribute('height', String(r.height));
    const rgb = `rgb(${solid(fill).map(Math.round).join(',')})`;
    clone.querySelectorAll('path,line,rect,polyline').forEach((p) => {
      if (!p.getAttribute('fill')) p.setAttribute('fill', rgb);
    });
    prims.push({
      top: r.top - R.top,
      bottom: r.bottom - R.top,
      async draw(doc, y) {
        doc.saveGraphicsState();
        doc.rect(X(clip.l), y(clip.t - R.top), (clip.r - clip.l) * S, (clip.b - clip.t) * S, null);
        doc.clip();
        doc.discardPath();
        const holder = document.createElement('div');
        holder.style.cssText = 'position:fixed;left:-20000px;top:0';
        holder.appendChild(clone);
        document.body.appendChild(holder);
        try {
          await svg2pdf(clone, doc, { x: X(r.left), y: y(r.top - R.top), width: r.width * S, height: r.height * S });
        } finally {
          holder.remove();
          doc.restoreGraphicsState();
        }
      }
    });
  };

  const image = (el: HTMLImageElement) => {
    const r = el.getBoundingClientRect();
    const src = el.src;
    const fmt = src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    prims.push({
      top: r.top - R.top,
      bottom: r.bottom - R.top,
      draw(doc, y) {
        const bw = 1.5 * S;
        doc.addImage(src, fmt, X(r.left) + bw, y(r.top - R.top) + bw, r.width * S - 2 * bw, r.height * S - 2 * bw);
      }
    });
  };

  const walk = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    // Rahmen mit abgeschnittenem Inhalt (Tabellen) erst nach dem Inhalt zeichnen
    const frameLast = cs.overflowX === 'hidden' && el.classList.contains('ps-tw');
    if (!frameLast) box(el, cs);
    if (el instanceof SVGSVGElement) return svg(el);
    if (el instanceof HTMLImageElement) return image(el);
    for (const n of [...el.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) text(n as Text);
      else if (n.nodeType === Node.ELEMENT_NODE) walk(n as Element);
    }
    if (frameLast) box(el, cs);
  };
  walk(root);
  return prims;
}

/** Seitenumbrüche: ganze Gruppen auf die nächste Seite, zu lange Gruppen an einer Zeilen- oder Tabellenzeilengrenze teilen. */
function paginate(root: HTMLElement, prims: Prim[]): { start: number; end: number }[] {
  const R = root.getBoundingClientRect();
  const avail = (BOTTOM - TOP) / S;
  const cuts = [
    ...prims.filter((p) => p.line).map((p) => p.bottom),
    ...[...root.querySelectorAll('.ps-cut, .ps-rule, .ps-g > *')].map((e) => e.getBoundingClientRect().bottom - R.top)
  ].sort((a, b) => a - b);
  const pages: { start: number; end: number }[] = [];
  let start = 0;
  for (const g of root.querySelectorAll<HTMLElement>('[data-g]')) {
    const r = g.getBoundingClientRect();
    const top = r.top - R.top + 6; // etwas Luft über der Gruppe gehört noch zur vorigen Seite
    const bottom = r.bottom - R.top;
    while (bottom - start > avail) {
      if (top > start + 1 && bottom - top <= avail) {
        pages.push({ start, end: top });
        start = top;
        break;
      }
      // Gruppe ist länger als eine Seite: an der letzten passenden Grenze teilen
      const limit = start + avail;
      const cut = [...cuts].reverse().find((c) => c <= limit && c > start + avail * 0.25) ?? limit;
      // Textzeilen, die über die Grenze ragen, kommen vollständig auf die nächste Seite
      const crossing = prims.filter((p) => p.line && p.top < cut && p.bottom > cut).map((p) => p.top);
      const end = crossing.length ? Math.min(...crossing) : cut;
      pages.push({ start, end });
      start = end;
    }
  }
  pages.push({ start, end: root.getBoundingClientRect().height + 1 });
  return pages.filter((p) => p.end - p.start > 1);
}

async function renderPdf(root: HTMLElement, footer: string): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const fonts = await loadFonts();
  for (const [name, data] of Object.entries(fonts)) {
    doc.addFileToVFS(`${name}.ttf`, data);
    doc.addFont(`${name}.ttf`, name, 'normal', 'Identity-H');
  }
  const prims = collect(root);
  const pages = paginate(root, prims);

  for (const [pi, pg] of pages.entries()) {
    if (pi) doc.addPage();
    const y = (v: number) => TOP + (v - pg.start) * S;
    for (const p of prims) {
      if (p.bottom <= pg.start || p.top >= pg.end) continue;
      if (p.line) {
        // ganze Zeilen nur auf der Seite, auf der sie beginnen
        if (p.top < pg.start - 0.5) continue;
        await p.draw(doc, y);
        continue;
      }
      const cut = p.top < pg.start || p.bottom > pg.end;
      if (cut) {
        doc.saveGraphicsState();
        doc.rect(0, TOP - 0.2, PAGE_W, (pg.end - pg.start) * S + 0.4, null);
        doc.clip();
        doc.discardPath();
      }
      await p.draw(doc, y);
      if (cut) doc.restoreGraphicsState();
    }
  }

  // Fußzeile im selben Stil wie die Beschriftungen der Webseite
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(210, 201, 181);
    doc.setLineWidth(0.3);
    doc.line(MX, PAGE_H - 12, PAGE_W - MX, PAGE_H - 12);
    doc.setFont('mono', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(105, 113, 126);
    doc.text(footer.toUpperCase(), MX, PAGE_H - 8, { charSpace: 0.15 });
    doc.text(`SEITE ${i} / ${n}`, PAGE_W - MX, PAGE_H - 8, { align: 'right', charSpace: 0.15 });
  }
  return doc;
}

export async function exportWorksheetPdf(ws: Worksheet, a: Answers, withSolutions = false): Promise<void> {
  const style = document.createElement('style');
  style.textContent = SHEET_CSS;
  const root = document.createElement('div');
  root.className = 'ps';
  root.innerHTML = sheetHtml(ws, a, withSolutions);
  document.head.appendChild(style);
  document.body.appendChild(root);
  try {
    await document.fonts.ready;
    await Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((ok) => (img.onload = img.onerror = ok)))));
    const plainTitle = ws.title.replace(/\$[^$]*\$/g, '').replace(/\*\*/g, '');
    const doc = await renderPdf(root, `${plainTitle} · ${a.name || 'ohne Namen'}`);
    const safe = (s: string) =>
      s
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
    const file = [withSolutions ? 'Erwartungshorizont' : 'Arbeitsblatt', safe(plainTitle), safe(a.name)].filter(Boolean).join('_');
    doc.save(`${file}.pdf`);
  } finally {
    root.remove();
    style.remove();
  }
}
