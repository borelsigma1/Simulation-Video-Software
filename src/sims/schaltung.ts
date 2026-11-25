/**
 * Einfache Schaltungen mit zwei Schaltern und einer Lampe:
 * Reihenschaltung (UND), Parallelschaltung (ODER) und Wechselschaltung.
 * Die Schalter werden direkt in der Zeichnung angetippt.
 */
import { box, disc, label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef, Stage } from '../lib/sim/types';

export function lampeAn(art: number, s1: boolean, s2: boolean): boolean {
  if (art === 0) return s1 && s2;
  if (art === 1) return s1 || s2;
  return s1 === s2; // Wechselschaltung: beide Schalter am selben Leiter
}

export const sim: SimDef = {
  id: 'schaltung',
  title: 'Schaltungen mit zwei Schaltern',
  summary: 'UND-, ODER- und Wechselschaltung: Schalter antippen und beobachten, wann die Lampe leuchtet.',
  animated: false,
  hint: 'Tippe in der Zeichnung auf einen Schalter, um ihn zu öffnen oder zu schließen.',
  params: [
    {
      key: 'art',
      label: 'Schaltung',
      unit: '',
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'Reihe' },
        { value: 1, label: 'Parallel' },
        { value: 2, label: 'Wechselschaltung' }
      ]
    }
  ],
  options: [{ key: 'weg', label: 'Geschlossenen Stromkreis farbig hervorheben', value: true }],
  plots: [],
  measures: [
    { key: 'S1', label: 'Schalter 1 (1 = geschlossen bzw. oben)', symbol: 'S_1', unit: '', digits: 0 },
    { key: 'S2', label: 'Schalter 2 (1 = geschlossen bzw. oben)', symbol: 'S_2', unit: '', digits: 0 },
    { key: 'L', label: 'Lampe (1 = leuchtet)', symbol: 'L', unit: '', digits: 0 }
  ],

  create(env) {
    const { p, show } = env;
    let s1 = false;
    let s2 = false;
    const an = () => lampeAn(p.art, s1, s2);

    /** Lage der Schalter in Pixeln (für Zeichnung und Antippen). */
    const geo = (g: Stage) => {
      const l = g.w * 0.14;
      const r = g.w * 0.86;
      const top = g.h * 0.24;
      const bot = g.h * 0.8;
      const mid = (l + r) / 2;
      const gap = Math.min(70, g.w * 0.11);
      const art = p.art;
      const sw =
        art === 0
          ? [
              { x: l + (r - l) * 0.3, y: top },
              { x: l + (r - l) * 0.62, y: top }
            ]
          : art === 1
            ? [
                { x: mid, y: top - g.h * 0.09 },
                { x: mid, y: top + g.h * 0.13 }
              ]
            : [
                { x: l + (r - l) * 0.27, y: top },
                { x: l + (r - l) * 0.73, y: top }
              ];
      return { l, r, top, bot, mid, gap, sw };
    };

    return {
      reset() {
        s1 = false;
        s2 = false;
      },
      update() {
        s1 = false;
        s2 = false;
      },
      measure: () => ({ S1: s1 ? 1 : 0, S2: s2 ? 1 : 0, L: an() ? 1 : 0 }),
      pointer(kind, x, y, g) {
        const { sw, gap } = geo(g);
        const hit = sw.findIndex((s) => Math.abs(x - s.x) < gap / 2 + 26 && Math.abs(y - s.y) < 44);
        if (kind === 'down' && hit >= 0) {
          if (hit === 0) s1 = !s1;
          else s2 = !s2;
          return 'pointer';
        }
        if (kind === 'move') return hit >= 0 ? 'pointer' : '';
      },
      draw(g) {
        const { ctx, w, h } = g;
        const { l, r, top, bot, gap, sw } = geo(g);
        paper(ctx, w, h, true);
        const on = an();
        const hot = show.weg ? theme.object : theme.text;
        const wire = (pts: number[], live: boolean) => {
          ctx.strokeStyle = live ? hot : theme.text;
          ctx.lineWidth = live && show.weg ? 3.5 : 2;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.stroke();
        };
        /** Ein-Aus-Schalter: Hebel liegt an oder steht ab. */
        const taster = (s: { x: number; y: number }, closed: boolean, live: boolean, name: string) => {
          const a = s.x - gap / 2;
          const b = s.x + gap / 2;
          ctx.strokeStyle = live ? hot : theme.text;
          ctx.lineWidth = live && show.weg ? 3.5 : 2.5;
          ctx.beginPath();
          ctx.moveTo(a, s.y);
          if (closed) ctx.lineTo(b, s.y);
          else ctx.lineTo(a + gap * 0.9, s.y - gap * 0.45);
          ctx.stroke();
          disc(ctx, a, s.y, 4.5, theme.bg, theme.text, 2);
          disc(ctx, b, s.y, 4.5, theme.bg, theme.text, 2);
          label(ctx, name, s.x, s.y + 26, { align: 'center', size: 15, bold: true });
        };

        const art = p.art;
        if (art === 0) {
          const [A, B] = sw;
          wire([l, top, A.x - gap / 2, top], on);
          wire([A.x + gap / 2, top, B.x - gap / 2, top], on);
          wire([B.x + gap / 2, top, r, top, r, bot, l, bot, l, top], on);
          taster(A, s1, on, 'S_1');
          taster(B, s2, on, 'S_2');
        } else if (art === 1) {
          const [A, B] = sw;
          const xl = A.x - gap * 1.6;
          const xr = A.x + gap * 1.6;
          wire([l, top, xl, top], on);
          wire([xr, top, r, top, r, bot, l, bot, l, top], on);
          wire([xl, top, xl, A.y, A.x - gap / 2, A.y], s1);
          wire([A.x + gap / 2, A.y, xr, A.y, xr, top], s1);
          wire([xl, top, xl, B.y, B.x - gap / 2, B.y], s2);
          wire([B.x + gap / 2, B.y, xr, B.y, xr, top], s2);
          taster(A, s1, s1, 'S_1');
          taster(B, s2, s2, 'S_2');
          disc(ctx, xl, top, 3.5, theme.text);
          disc(ctx, xr, top, 3.5, theme.text);
        } else {
          const [A, B] = sw;
          const dy = Math.min(46, h * 0.1);
          wire([l, top, A.x - 18, top], on);
          wire([B.x + 18, top, r, top, r, bot, l, bot, l, top], on);
          wire([A.x + 26, top - dy, B.x - 26, top - dy], on && s1);
          wire([A.x + 26, top + dy, B.x - 26, top + dy], on && !s1);
          const umschalter = (s: { x: number; y: number }, up: boolean, dir: number, name: string) => {
            ctx.strokeStyle = on ? hot : theme.text;
            ctx.lineWidth = on && show.weg ? 3.5 : 2.5;
            ctx.beginPath();
            ctx.moveTo(s.x - 18 * dir, top);
            ctx.lineTo(s.x + 24 * dir, top + (up ? -dy : dy));
            ctx.stroke();
            disc(ctx, s.x - 18 * dir, top, 4.5, theme.bg, theme.text, 2);
            disc(ctx, s.x + 26 * dir, top - dy, 4.5, theme.bg, theme.text, 2);
            disc(ctx, s.x + 26 * dir, top + dy, 4.5, theme.bg, theme.text, 2);
            label(ctx, name, s.x, top + dy + 30, { align: 'center', size: 15, bold: true });
          };
          umschalter(A, s1, 1, 'S_1');
          umschalter(B, s2, -1, 'S_2');
        }

        // Batterie unten
        const bx = (l + r) / 2 - w * 0.16;
        box(ctx, bx - 14, bot - 22, 28, 44, theme.bg);
        line(ctx, bx - 6, bot - 20, bx - 6, bot + 20, theme.text, 2.5);
        line(ctx, bx + 6, bot - 10, bx + 6, bot + 10, theme.text, 5);
        label(ctx, '+', bx - 16, bot - 26, { size: 15, bold: true, color: theme.plus });
        label(ctx, '–', bx + 12, bot - 26, { size: 15, bold: true, color: theme.minus });
        label(ctx, 'Batterie', bx, bot + 40, { align: 'center', size: 12, color: theme.muted });

        // Lampe unten rechts
        const lx = (l + r) / 2 + w * 0.16;
        const R = 22;
        if (on) {
          const glow = ctx.createRadialGradient(lx, bot, R * 0.4, lx, bot, R * 3.2);
          glow.addColorStop(0, 'rgba(240,169,12,0.6)');
          glow.addColorStop(1, 'rgba(240,169,12,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(lx - R * 3.3, bot - R * 3.3, R * 6.6, R * 6.6);
        }
        disc(ctx, lx, bot, R, on ? '#ffd75e' : theme.bg, theme.text, 2.5);
        const q = R * 0.7;
        line(ctx, lx - q, bot - q, lx + q, bot + q, theme.text, 2);
        line(ctx, lx - q, bot + q, lx + q, bot - q, theme.text, 2);
        label(ctx, on ? 'Lampe leuchtet' : 'Lampe aus', lx, bot + 44, { align: 'center', size: 13, bold: on, color: on ? theme.text : theme.muted });
      }
    };
  }
};
