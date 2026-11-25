/**
 * Formelsatz mit KaTeX.
 *
 * Inhalte bleiben einfach zu schreiben: Formelzeichen wie in den Simulationen
 * ("v_0", "E_kin", "ϑ"), Einheiten wie "m/s²" oder "10⁶ m/s". Diese Datei
 * übersetzt sie in TeX und setzt sie mit KaTeX. In Arbeitsblatt-Texten steht
 * Mathematik zwischen Dollarzeichen: "$E = \frac{1}{2}\,m\,v^2$".
 */
import katex from 'katex';
import 'katex/dist/katex.min.css';

const cache = new Map<string, string>();

/** TeX-Quelltext als HTML (inline). Fehlerhafte Eingaben erscheinen rot statt abzustürzen. */
export function tex(src: string, display = false): string {
  const key = (display ? 'D' : 'I') + src;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(src, { throwOnError: false, displayMode: display, strict: 'ignore', output: 'html' });
    if (cache.size > 4000) cache.clear();
    cache.set(key, html);
  }
  return html;
}

const GREEK: Record<string, string> = {
  α: '\\alpha', β: '\\beta', γ: '\\gamma', δ: '\\delta', Δ: '\\Delta', ε: '\\varepsilon', η: '\\eta', ϑ: '\\vartheta',
  θ: '\\theta', λ: '\\lambda', μ: '\\mu', µ: '\\mu', ν: '\\nu', π: '\\pi', ρ: '\\rho', σ: '\\sigma', τ: '\\tau',
  φ: '\\varphi', ω: '\\omega', Ω: '\\Omega', ψ: '\\psi', Ψ: '\\Psi', Φ: '\\Phi'
};
const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
const SUB_DIGITS: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4' };

/** Einzelne Zeichen (griechisch, Akzente) eines Formelzeichens nach TeX. */
function chars(s: string): string {
  let out = '';
  for (const ch of s) {
    if (GREEK[ch]) out += GREEK[ch] + ' ';
    else if (ch === 'ŝ') out += '\\hat{s}';
    else if (ch === '½') out += '1/2';
    else if (SUB_DIGITS[ch]) out += `_{${SUB_DIGITS[ch]}}`;
    else if (ch === '·') out += '\\cdot ';
    else out += ch;
  }
  return out.trim();
}

/**
 * Formelzeichen der Simulationen nach TeX: "v_0" -> v_0, "E_kin" -> E_{\mathrm{kin}},
 * "T_½" -> T_{1/2}, "ln N" -> \ln N. Mehrbuchstabige Indizes werden aufrecht gesetzt.
 */
export function symTex(sym: string): string {
  const s = sym.trim();
  if (/^ln /.test(s)) return `\\ln ${symTex(s.slice(3))}`;
  const m = /^([^_]+)_([A-Za-z0-9½]+)(.*)$/.exec(s);
  if (!m) return chars(s);
  const base = chars(m[1]);
  const idx = m[2];
  const sub = /^[A-Za-z]{2,}$/.test(idx) ? `\\mathrm{${idx}}` : chars(idx);
  return `${base}_{${sub}}${m[3] ? chars(m[3]) : ''}`;
}

/** Einheit nach TeX: "m/s²" -> \mathrm{m/s^{2}}, "10⁶ m/s" -> 10^{6}\,\mathrm{m/s}, "°C" -> {}^\circ\mathrm{C}. */
export function unitTex(unit: string): string {
  if (!unit) return '';
  let u = unit.trim();
  let pre = '';
  const pow = /^10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)\s*/.exec(u);
  if (pow) {
    pre = `10^{${[...pow[1]].map((c) => SUP[c]).join('')}}\\,`;
    u = u.slice(pow[0].length);
  }
  if (u === '%') return `${pre}\\%`;
  u = u.replace(/√([A-Za-zΩµ]+)/g, '\u0001$1\u0002');
  let out = '';
  let sup = '';
  const flush = () => {
    if (sup) out += `^{${sup}}`;
    sup = '';
  };
  for (const ch of u) {
    if (SUP[ch]) {
      sup += SUP[ch];
      continue;
    }
    flush();
    if (ch === '°') out += '{}^{\\circ}';
    else if (ch === 'Ω') out += '\\Omega ';
    else if (ch === 'µ' || ch === 'μ') out += '\\mu ';
    else if (ch === '·') out += '\\cdot ';
    else if (ch === ' ') out += '\\,';
    else if (ch === '%') out += '\\%';
    else out += ch;
  }
  flush();
  out = out.replace(/\u0001/g, '\\sqrt{').replace(/\u0002/g, '}');
  return out ? `${pre}\\mathrm{${out}}` : pre.replace(/\\,$/, '');
}

/** Zahl im deutschen Format als TeX: 1234.5 -> 1\,234{,}5; negative Zahlen mit echtem Minus. */
export function numTex(v: number, digits: number): string {
  const s = v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: Math.abs(v) >= 10000 });
  return s.replace(/\./g, '\\,').replace(',', '{,}').replace('-', '-');
}

/** Wert mit Einheit, z. B. "0{,}50\,\mathrm{kg}". */
export function quantityTex(v: number | null, digits: number, unit: string): string {
  const n = v === null || !Number.isFinite(v) ? '\\text{–}' : numTex(Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v, digits);
  const u = unitTex(unit);
  return u ? `${n}\\,${u}` : n;
}

/** Text mit $…$-Abschnitten in Teile zerlegen. "\$" steht für ein echtes Dollarzeichen. */
export function splitMath(src: string): { text: string; math: boolean }[] {
  const out: { text: string; math: boolean }[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index), math: false });
    out.push({ text: m[1], math: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last), math: false });
  return out;
}

/**
 * Spaltenbeschriftung als Text mit $…$: Steht schon TeX darin, bleibt sie, wie sie ist.
 * Ein kurzes Formelzeichen ohne Dollarzeichen ("v_0", "T²", "λ") wird als Formel gesetzt.
 */
export function labelText(label: string): string {
  const s = label.trim();
  if (!s || s.includes('$')) return label;
  if (/^[^\s]{1,10}$/.test(s) && (/[_²³α-ωΔΩϑ√]/.test(s) || /^[A-Za-z]$/.test(s))) return `$${symTex(s)}$`;
  return label;
}

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Text mit $…$ als HTML (Text wird maskiert, nur KaTeX erzeugt Markup).
 * Ein Satzzeichen direkt nach einer Formel bleibt mit ihr in derselben Zeile.
 */
export function mathHtml(src: string): string {
  const parts = splitMath(src);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.math) {
      out += escHtml(p.text);
      continue;
    }
    const next = parts[i + 1];
    const glue = next && !next.math ? (/^[.,;:!?)“"]+/.exec(next.text)?.[0] ?? '') : '';
    if (glue) {
      out += `<span class="nobr" style="white-space:nowrap">${tex(p.text)}${escHtml(glue)}</span>`;
      next.text = next.text.slice(glue.length);
    } else out += tex(p.text);
  }
  return out;
}

/** Text ohne Formelsatz (für Titel, Tooltips): Dollarzeichen und einfache Befehle entfernen. */
export function plainMath(src: string): string {
  return src.replace(/\$([^$]+)\$/g, (_, t: string) =>
    t
      .replace(/\\(frac)\{([^}]*)\}\{([^}]*)\}/g, '$2/$3')
      .replace(/\\(mathrm|text)\{([^}]*)\}/g, '$2')
      .replace(/\\cdot/g, '·')
      .replace(/\\[,;!]/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\\([A-Za-z]+)/g, '$1')
  );
}
