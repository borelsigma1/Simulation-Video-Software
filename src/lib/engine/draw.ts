/** Kleine Zeichenhilfen, die mehrere Simulationen gemeinsam nutzen. */
import { theme } from './theme';

export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2.5
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const head = Math.min(12, len * 0.4);
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(ang) * head * 0.8, y2 - Math.sin(ang) * head * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Text zeichnen. Ein Unterstrich erzeugt einen Index: "v_y" -> v mit tiefgestelltem y,
 * "h_max" -> h mit tiefgestelltem max.
 */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { color?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline; size?: number; bold?: boolean } = {}
): void {
  const size = opts.size ?? 13;
  const weight = opts.bold ? '600 ' : '';
  const main = `${weight}${size}px ${theme.font}`;
  const sub = `${weight}${Math.round(size * 0.72)}px ${theme.font}`;
  const parts = splitSubscripts(text);
  ctx.save();
  ctx.fillStyle = opts.color ?? theme.text;
  ctx.textBaseline = opts.baseline ?? 'alphabetic';
  ctx.textAlign = 'left';
  let total = 0;
  for (const p of parts) {
    ctx.font = p.sub ? sub : main;
    total += ctx.measureText(p.text).width;
  }
  const align = opts.align ?? 'left';
  let cx = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
  for (const p of parts) {
    ctx.font = p.sub ? sub : main;
    ctx.fillText(p.text, cx, p.sub ? y + size * 0.28 : y);
    cx += ctx.measureText(p.text).width;
  }
  ctx.restore();
}

export function splitSubscripts(text: string): { text: string; sub: boolean }[] {
  const out: { text: string; sub: boolean }[] = [];
  const re = /_([A-Za-z0-9]+)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), sub: false });
    out.push({ text: m[1], sub: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), sub: false });
  return out;
}

/** Zahl im deutschen Format, z. B. 3,14 */
export function fmt(value: number, digits = 2): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

// ---------- Weitere gemeinsame Zeichenhilfen ----------

/** Papierhintergrund, optional mit feinem Punktraster. */
export function paper(ctx: CanvasRenderingContext2D, w: number, h: number, dots = false): void {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, w, h);
  if (!dots) return;
  ctx.fillStyle = theme.gridStrong;
  for (let x = 12; x < w; x += 24) for (let y = 12; y < h; y += 24) ctx.fillRect(x, y, 1.2, 1.2);
}

export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string = theme.text,
  width = 1.5,
  dash?: number[]
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function disc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  width = 2
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | null,
  stroke?: string,
  r = 0,
  width = 1.5
): void {
  ctx.beginPath();
  if (r > 0) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function polyline(
  ctx: CanvasRenderingContext2D,
  pts: ArrayLike<number>,
  color: string,
  width = 2,
  dash?: number[]
): void {
  if (pts.length < 4) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
  ctx.restore();
}

/** Schraffierte Wand/Decke (wie in Schulbuchskizzen). */
export function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fillStyle = '#e9e3d3';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = theme.metalDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -h; i < w + h; i += 9) {
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Zickzack-Feder zwischen zwei Punkten. */
export function spring(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils = 12,
  amp = 11,
  color: string = theme.spring
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const lead = Math.min(10, len * 0.12);
  const body = len - 2 * lead;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
  for (let i = 0; i < coils; i++) {
    const d = lead + (body * (i + 0.5)) / coils;
    const s = i % 2 === 0 ? amp : -amp;
    ctx.lineTo(x1 + ux * d - uy * s, y1 + uy * d + ux * s);
  }
  ctx.lineTo(x2 - ux * lead, y2 - uy * lead);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
