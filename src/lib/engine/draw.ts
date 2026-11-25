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
