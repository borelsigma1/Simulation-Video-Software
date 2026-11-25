/**
 * Abbildung durch eine dünne Sammellinse mit den drei Konstruktionsstrahlen.
 * Für g > f entsteht ein reelles, für g < f ein virtuelles Bild.
 */
import { arrow, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { grip, Handles, point } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

/** Bildweite b (negativ = virtuelles Bild) und Bildgröße B (negativ = umgekehrt). */
export function abbildung(g: number, f: number, G: number): { b: number; B: number } | null {
  if (Math.abs(g - f) < 1e-9) return null;
  const b = (f * g) / (g - f);
  return { b, B: (-G * b) / g };
}

export const sim: SimDef = {
  id: 'sammellinse',
  title: 'Abbildung durch eine Sammellinse',
  summary: 'Gegenstandsweite und Brennweite verändern und mit Konstruktionsstrahlen Lage, Größe und Art des Bildes untersuchen.',
  animated: false,
  params: [
    { key: 'g', label: 'Gegenstandsweite', symbol: 'g', unit: 'cm', min: 4, max: 60, step: 0.5, value: 30 },
    { key: 'f', label: 'Brennweite der Linse', symbol: 'f', unit: 'cm', min: 5, max: 25, step: 0.5, value: 12 },
    { key: 'G', label: 'Gegenstandsgröße', symbol: 'G', unit: 'cm', min: 1, max: 8, step: 0.5, value: 5 }
  ],
  options: [
    { key: 'parallel', label: 'Parallelstrahl', value: true },
    { key: 'mitte', label: 'Mittelpunktstrahl', value: true },
    { key: 'brenn', label: 'Brennpunktstrahl', value: true },
    { key: 'masse', label: 'Bildweite und Bildgröße einzeichnen', value: false }
  ],
  plots: [],
  hint: 'Gegenstand und Brennpunkt lassen sich in der Zeichnung mit Maus oder Finger verschieben: den Fuß des Pfeils waagrecht, die Spitze nach oben und unten, F seitlich.',
  measures: [
    { key: 'b', label: 'Bildweite (negativ: Bild auf der Gegenstandsseite)', symbol: 'b', unit: 'cm', digits: 1 },
    { key: 'B', label: 'Bildgröße', symbol: 'B', unit: 'cm', digits: 1 }
  ],

  create(env) {
    const { p, show } = env;
    const img = () => abbildung(p.g, p.f, p.G);
    const hs = new Handles();
    return {
      reset() {},
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      measure() {
        const a = img();
        return { b: a && Math.abs(a.b) < 1000 ? a.b : null, B: a && Math.abs(a.b) < 1000 ? Math.abs(a.B) : null };
      },
      draw(st) {
        const { ctx, w, h } = st;
        paper(ctx, w, h);
        const left = 64; // dargestellter Bereich links/rechts der Linse in cm
        const right = 96;
        const scale = Math.min((w - 24) / (left + right), (h - 30) / 30);
        const ox = 12 + left * scale;
        const cy = h / 2;
        const X = (cm: number) => ox + cm * scale;
        const Y = (cm: number) => cy - cm * scale;
        const xMin = -left - 2;
        const xMax = right + 2;

        // Raster 10 cm, optische Achse
        for (let c = -60; c <= 90; c += 10) {
          line(ctx, X(c), 0, X(c), h, theme.grid, 1);
          if (c !== 0) label(ctx, `${Math.abs(c)}`, X(c), cy + 16, { align: 'center', size: 11, color: theme.muted });
        }
        line(ctx, 0, cy, w, cy, theme.axis, 1.2);
        label(ctx, 'optische Achse, Teilung in cm', 10, 18, { size: 11, color: theme.muted });

        // Linse
        const lh = Math.min(h * 0.44, 13 * scale);
        ctx.fillStyle = theme.glass;
        ctx.strokeStyle = theme.waterDark;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ox, cy - lh);
        ctx.quadraticCurveTo(ox + 15, cy, ox, cy + lh);
        ctx.quadraticCurveTo(ox - 15, cy, ox, cy - lh);
        ctx.fill();
        ctx.stroke();
        line(ctx, ox, cy - lh - 8, ox, cy + lh + 8, theme.waterDark, 1, [4, 4]);
        for (const s of [-1, 1]) {
          disc(ctx, X(s * p.f), cy, 3.5, theme.text);
          label(ctx, s < 0 ? 'F' : "F'", X(s * p.f), cy - 9, { align: 'center', size: 13, bold: true });
        }

        const a = img();
        const gx = -p.g;
        const tip = { x: gx, y: p.G };
        /** Strahl ab Punkt (x0,y0) mit Steigung m bis zum Bildrand. */
        const ray = (x0: number, y0: number, m: number, color: string, toX: number, dash?: number[]) =>
          line(ctx, X(x0), Y(y0), X(toX), Y(y0 + m * (toX - x0)), color, dash ? 1.3 : 2, dash);
        const virtual = !!a && a.b < 0;
        const back = (y0: number, m: number, color: string) => {
          if (virtual) ray(0, y0, m, color, xMin, [5, 5]);
        };

        if (show.parallel) {
          line(ctx, X(gx), Y(tip.y), X(0), Y(tip.y), theme.object, 2);
          ray(0, tip.y, -tip.y / p.f, theme.object, xMax);
          back(tip.y, -tip.y / p.f, theme.object);
        }
        if (show.mitte) {
          ray(gx, tip.y, -tip.y / p.g, theme.acceleration, xMax);
          if (virtual) ray(gx, tip.y, -tip.y / p.g, theme.acceleration, xMin, [5, 5]);
        }
        if (show.brenn && Math.abs(p.g - p.f) > 0.01) {
          // Strahl (bzw. seine Verlängerung) durch den gegenstandsseitigen Brennpunkt
          const m = (0 - tip.y) / (-p.f - gx);
          const yL = tip.y + m * (0 - gx);
          if (Math.abs(yL) < lh / scale + 40) {
            line(ctx, X(gx), Y(tip.y), X(0), Y(yL), theme.velocity, 2);
            ray(0, yL, 0, theme.velocity, xMax);
            back(yL, 0, theme.velocity);
          }
        }

        // Gegenstand
        arrow(ctx, X(gx), cy, X(gx), Y(p.G), theme.text, 3.5);
        label(ctx, 'G', X(gx) - 8, Y(p.G / 2) + 4, { align: 'right', size: 14, bold: true });

        // Anfasser: Fuß des Gegenstands (g), Spitze (G), Brennpunkt (f)
        hs.begin();
        if (env.canSet('g')) {
          const hg = hs.add({ dist: point(X(gx), cy), cursor: 'ew-resize', radius: 16, drag: (x) => env.set('g', -(x - ox) / scale) });
          grip(ctx, X(gx), cy, 'h', hs.isHover(hg));
        }
        if (env.canSet('G')) {
          const hG = hs.add({ dist: point(X(gx), Y(p.G)), cursor: 'ns-resize', radius: 16, drag: (_x, y) => env.set('G', (cy - y) / scale) });
          grip(ctx, X(gx), Y(p.G) - 12, 'v', hs.isHover(hG));
        }
        if (env.canSet('f')) {
          for (const sgn of [-1, 1]) {
            const hf = hs.add({ dist: point(X(sgn * p.f), cy), cursor: 'ew-resize', radius: 14, drag: (x) => env.set('f', Math.abs(x - ox) / scale) });
            if (hs.isHover(hf)) grip(ctx, X(sgn * p.f), cy, 'h', true);
          }
        }

        // Bild
        if (a && Math.abs(a.b) < 400) {
          ctx.save();
          if (virtual) ctx.setLineDash([6, 4]);
          arrow(ctx, X(a.b), cy, X(a.b), Y(a.B), theme.force, 3.5);
          ctx.restore();
          label(ctx, virtual ? 'B (virtuell)' : 'B', X(a.b) + 9, Y(a.B / 2) + 4, { size: 14, bold: true, color: theme.force });
          if (show.masse && a.b > xMin && a.b < xMax) {
            const yy = h - 16;
            line(ctx, X(0), yy, X(a.b), yy, theme.force, 1.5);
            line(ctx, X(0), yy - 5, X(0), yy + 5, theme.force, 1.5);
            line(ctx, X(a.b), yy - 5, X(a.b), yy + 5, theme.force, 1.5);
            label(ctx, `b = ${fmt(a.b, 1)} cm`, X(a.b / 2), yy - 6, { align: 'center', size: 12, color: theme.force, bold: true });
            label(ctx, `B = ${fmt(Math.abs(a.B), 1)} cm`, X(a.b) + 9, Y(a.B / 2) + 20, { size: 12, color: theme.force });
          }
        } else {
          label(ctx, 'Kein Bild: Die Strahlen verlaufen hinter der Linse parallel.', w / 2, 22, { align: 'center', size: 13, bold: true });
        }
      }
    };
  }
};
