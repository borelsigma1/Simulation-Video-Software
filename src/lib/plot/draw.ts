/**
 * Schlankes Diagramm auf Canvas: Linien oder Messpunkte, runde Achsenteilung,
 * deutsche Zahlenschreibweise. Wird von den Simulationen (Live-Diagramm), von
 * der Diagrammaufgabe im Arbeitsblatt und vom PDF-Export benutzt.
 */
import { niceStep } from '../engine/canvas';
import { label } from '../engine/draw';
import { theme } from '../engine/theme';
import type { PlotData } from '../sim/types';

export interface PlotSpec {
  xLabel: string;
  yLabel: string;
  series: { label: string; color: string }[];
}

function extent(arrs: number[][]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const a of arrs)
    for (const v of a) {
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  if (lo === Infinity) return [0, 1];
  return [lo, hi];
}

/** Bereich so wählen, dass die Null dabei ist und oben etwas Luft bleibt. */
function autoRange(arrs: number[][]): [number, number] {
  let [lo, hi] = extent(arrs);
  lo = Math.min(lo, 0);
  hi = Math.max(hi, 0);
  if (hi - lo < 1e-12) hi = lo + 1;
  const pad = (hi - lo) * 0.08;
  return [lo < 0 ? lo - pad : 0, hi > 0 ? hi + pad : 0];
}

const de = (v: number, step: number) => {
  const digits = Math.max(0, Math.min(6, -Math.floor(Math.log10(step) + 1e-9)));
  return (Math.abs(v) < step * 1e-6 ? 0 : v).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};

export function drawPlot(ctx: CanvasRenderingContext2D, w: number, h: number, spec: PlotSpec, data: PlotData): void {
  const legend = spec.series.length > 1;
  const M = { l: 58, r: 16, t: legend ? 28 : 14, b: 40 };
  const pw = Math.max(10, w - M.l - M.r);
  const ph = Math.max(10, h - M.t - M.b);
  const [x0, x1] = data.xRange ?? autoRange([data.x]);
  const [y0, y1] = data.yRange ?? autoRange(data.ys);
  const X = (v: number) => M.l + ((v - x0) / (x1 - x0 || 1)) * pw;
  const Y = (v: number) => M.t + ph - ((v - y0) / (y1 - y0 || 1)) * ph;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, w, h);

  // Gitter und Achsenbeschriftung
  const sx = niceStep((x1 - x0) / Math.max(2, pw / 80));
  const sy = niceStep((y1 - y0) / Math.max(2, ph / 42));
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.grid;
  ctx.beginPath();
  for (let v = Math.ceil(x0 / sx - 1e-9) * sx; v <= x1 + sx * 1e-6; v += sx) {
    const px = Math.round(X(v)) + 0.5;
    ctx.moveTo(px, M.t);
    ctx.lineTo(px, M.t + ph);
  }
  for (let v = Math.ceil(y0 / sy - 1e-9) * sy; v <= y1 + sy * 1e-6; v += sy) {
    const py = Math.round(Y(v)) + 0.5;
    ctx.moveTo(M.l, py);
    ctx.lineTo(M.l + pw, py);
  }
  ctx.stroke();
  for (let v = Math.ceil(x0 / sx - 1e-9) * sx; v <= x1 + sx * 1e-6; v += sx)
    label(ctx, de(v, sx), X(v), M.t + ph + 16, { align: 'center', size: 11.5, color: theme.muted });
  for (let v = Math.ceil(y0 / sy - 1e-9) * sy; v <= y1 + sy * 1e-6; v += sy)
    label(ctx, de(v, sy), M.l - 7, Y(v) + 4, { align: 'right', size: 11.5, color: theme.muted });

  // Achsen (durch die Null, falls sichtbar)
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  const ax = Math.round(Y(Math.min(Math.max(0, y0), y1))) + 0.5;
  const ay = Math.round(X(Math.min(Math.max(0, x0), x1))) + 0.5;
  ctx.beginPath();
  ctx.moveTo(M.l, ax);
  ctx.lineTo(M.l + pw, ax);
  ctx.moveTo(ay, M.t);
  ctx.lineTo(ay, M.t + ph);
  ctx.stroke();
  label(ctx, spec.xLabel, M.l + pw, h - 6, { align: 'right', size: 12, color: theme.text });
  ctx.save();
  ctx.translate(13, M.t);
  ctx.rotate(-Math.PI / 2);
  label(ctx, spec.yLabel, 0, 0, { align: 'right', size: 12, color: theme.text });
  ctx.restore();

  // Kurven
  ctx.save();
  ctx.beginPath();
  ctx.rect(M.l, M.t - 4, pw + 4, ph + 8);
  ctx.clip();
  if (data.line) {
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(data.line.m * x0 + data.line.t));
    ctx.lineTo(X(x1), Y(data.line.m * x1 + data.line.t));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  data.ys.forEach((ys, si) => {
    const color = spec.series[si]?.color ?? theme.object;
    if (data.markers) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < data.x.length; i++) {
        if (!Number.isFinite(data.x[i]) || !Number.isFinite(ys[i])) continue;
        const px = X(data.x[i]);
        const py = Y(ys[i]);
        ctx.beginPath();
        ctx.moveTo(px - 5, py - 5);
        ctx.lineTo(px + 5, py + 5);
        ctx.moveTo(px - 5, py + 5);
        ctx.lineTo(px + 5, py - 5);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < data.x.length; i++) {
        if (!Number.isFinite(ys[i])) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(X(data.x[i]), Y(ys[i]));
        else ctx.moveTo(X(data.x[i]), Y(ys[i]));
        pen = true;
      }
      ctx.stroke();
    }
  });
  ctx.restore();

  if (legend) {
    let lx = M.l;
    for (const s of spec.series) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, 9, 14, 4);
      label(ctx, s.label, lx + 19, 15, { size: 11.5, color: theme.text });
      ctx.font = `11.5px ${theme.font}`;
      lx += 19 + ctx.measureText(s.label).width + 16;
    }
  }
}

/** Ausgleichsgerade nach der Methode der kleinsten Quadrate. `origin`: Ursprungsgerade. */
export function fitLine(xs: number[], ys: number[], origin: boolean): { m: number; t: number } | null {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pts.length < 2) return null;
  if (origin) {
    const sxx = pts.reduce((a, [x]) => a + x * x, 0);
    if (sxx === 0) return null;
    return { m: pts.reduce((a, [x, y]) => a + x * y, 0) / sxx, t: 0 };
  }
  const n = pts.length;
  const mx = pts.reduce((a, [x]) => a + x, 0) / n;
  const my = pts.reduce((a, [, y]) => a + y, 0) / n;
  const sxx = pts.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const m = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / sxx;
  return { m, t: my - m * mx };
}
