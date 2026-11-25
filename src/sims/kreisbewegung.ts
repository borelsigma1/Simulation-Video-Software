/**
 * Gleichförmige Kreisbewegung: Ein Puck gleitet reibungsfrei auf einem Tisch
 * und wird von einem Faden auf der Kreisbahn gehalten (Blick von oben).
 * Wird der Faden durchgeschnitten, fliegt der Puck geradeaus weiter.
 */
import { arrow, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { Handles } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const R_MAX = 1;

/** Zentripetalkraft in N. */
export const zentripetalkraft = (m: number, r: number, T: number): number => (m * 4 * Math.PI * Math.PI * r) / (T * T);

export const sim: SimDef = {
  id: 'kreisbewegung',
  title: 'Kreisbewegung',
  summary: 'Ein Puck am Faden auf der Kreisbahn: Bahngeschwindigkeit und Zentripetalkraft untersuchen, Faden durchschneiden.',
  animated: true,
  playLabel: 'Starten',
  thumbTime: 0.3,
  hint: 'Der Puck lässt sich nach innen oder außen ziehen; so ändert sich der Bahnradius. Blick von oben auf einen reibungsfreien Tisch. Der Kraftmesser in der Mitte zeigt die Kraft, mit der der Faden am Puck zieht.',
  params: [
    { key: 'm', label: 'Masse des Pucks', symbol: 'm', unit: 'kg', min: 0.1, max: 1, step: 0.05, value: 0.2, live: true },
    { key: 'r', label: 'Bahnradius', symbol: 'r', unit: 'm', min: 0.2, max: R_MAX, step: 0.05, value: 0.6, live: true },
    { key: 'T', label: 'Umlaufdauer', symbol: 'T', unit: 's', min: 0.5, max: 4, step: 0.1, value: 2, live: true }
  ],
  options: [
    { key: 'v', label: 'Geschwindigkeitspfeil', value: true },
    { key: 'F', label: 'Kraftpfeil (Zentripetalkraft)', value: true },
    { key: 'spur', label: 'Bahn des Pucks zeichnen', value: true },
    { key: 'schnitt', label: 'Faden durchschneiden', value: false }
  ],
  plots: [
    {
      key: 'xy',
      label: 'x(t), y(t)',
      xLabel: 't in s',
      yLabel: 'Ort in m',
      series: [
        { label: 'x', color: theme.object },
        { label: 'y', color: theme.velocity }
      ]
    }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 2 },
    { key: 'v', label: 'Bahngeschwindigkeit', symbol: 'v', unit: 'm/s', digits: 2 },
    { key: 'omega', label: 'Winkelgeschwindigkeit', symbol: 'ω', unit: '1/s', digits: 2 },
    { key: 'F', label: 'Zentripetalkraft (Kraftmesser)', symbol: 'F_Z', unit: 'N', digits: 2 },
    { key: 'a', label: 'Zentripetalbeschleunigung', symbol: 'a_Z', unit: 'm/s²', digits: 2, readout: false }
  ],

  create(env) {
    const { p, show } = env;
    let t = 0;
    let phi = 0;
    let n = 0;
    /** Zustand nach dem Durchschneiden: Ort und (konstante) Geschwindigkeit */
    let frei: { x: number; y: number; vx: number; vy: number } | null = null;
    let spur: number[] = [];
    const buf = { t: [] as number[], x: [] as number[], y: [] as number[] };
    const v = () => (2 * Math.PI * p.r) / p.T;
    const ort = () => (frei ? { x: frei.x, y: frei.y } : { x: p.r * Math.cos(phi), y: p.r * Math.sin(phi) });
    const sample = () => {
      const o = ort();
      buf.t.push(t);
      buf.x.push(o.x);
      buf.y.push(o.y);
      spur.push(o.x, o.y);
      if (buf.t.length > 1200) {
        buf.t.shift();
        buf.x.shift();
        buf.y.shift();
      }
      if (spur.length > 1600) spur.splice(0, 2);
    };
    const hs = new Handles();
    return {
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      reset() {
        t = 0;
        phi = 0;
        n = 0;
        frei = null;
        spur = [];
        buf.t.length = buf.x.length = buf.y.length = 0;
        sample();
      },
      update(key) {
        if (key === 'r' && !frei) spur = [];
      },
      step(dt) {
        t += dt;
        if (show.schnitt && !frei) {
          const s = v();
          frei = { x: p.r * Math.cos(phi), y: p.r * Math.sin(phi), vx: -s * Math.sin(phi), vy: s * Math.cos(phi) };
        }
        if (!show.schnitt && frei) {
          // Faden wieder anbringen: Puck zurück auf die Bahn
          frei = null;
          spur = [];
        }
        if (frei) {
          frei.x += frei.vx * dt;
          frei.y += frei.vy * dt;
          if (Math.hypot(frei.x, frei.y) > 2.6) {
            sample();
            env.finish();
            return;
          }
        } else phi += ((2 * Math.PI) / p.T) * dt;
        if (++n % 4 === 0) sample();
      },
      measure: () => {
        const s = frei ? Math.hypot(frei.vx, frei.vy) : v();
        return {
          t,
          v: s,
          omega: frei ? null : (2 * Math.PI) / p.T,
          F: frei ? 0 : zentripetalkraft(p.m, p.r, p.T),
          a: frei ? 0 : (s * s) / p.r
        };
      },
      plot() {
        const t1 = Math.max(6, t);
        return { x: buf.t, ys: [buf.x, buf.y], xRange: [Math.max(0, t1 - 6), t1], yRange: [-1.1, 1.1] };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const scale = Math.min(w - 40, h - 30) / (2 * R_MAX + 0.5);
        const cx = w / 2;
        const cy = h / 2;
        const X = (m: number) => cx + m * scale;
        const Y = (m: number) => cy - m * scale;
        // Tisch und Maßstab
        disc(ctx, cx, cy, (R_MAX + 0.18) * scale, '#f6f0df', theme.gridStrong, 1.5);
        for (let r = 0.2; r <= R_MAX + 1e-9; r += 0.2) {
          ctx.beginPath();
          ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
          ctx.strokeStyle = theme.grid;
          ctx.lineWidth = 1;
          ctx.stroke();
          label(ctx, `${fmt(r, 1)} m`, cx + 4, Y(r) - 3, { size: 10, color: theme.muted });
        }
        if (show.spur && spur.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(X(spur[0]), Y(spur[1]));
          for (let i = 2; i < spur.length; i += 2) ctx.lineTo(X(spur[i]), Y(spur[i + 1]));
          ctx.strokeStyle = 'rgba(226, 87, 43, 0.45)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        const o = ort();
        const px = X(o.x);
        const py = Y(o.y);
        if (!frei) line(ctx, cx, cy, px, py, theme.spring, 2);
        else {
          // loses Fadenende an der Achse
          line(ctx, cx, cy, cx + 26, cy + 14, theme.spring, 2);
          label(ctx, 'Faden durchgeschnitten', cx, cy + 40, { align: 'center', size: 12, bold: true, color: theme.force });
        }
        disc(ctx, cx, cy, 7, theme.metal, theme.text, 2);
        const s = frei ? Math.hypot(frei.vx, frei.vy) : v();
        const dir = frei ? { x: frei.vx / s, y: frei.vy / s } : { x: -Math.sin(phi), y: Math.cos(phi) };
        if (show.F && !frei) {
          const F = zentripetalkraft(p.m, p.r, p.T);
          const len = Math.min(p.r * scale - 14, 14 + F * 9);
          arrow(ctx, px, py, px - Math.cos(phi) * len, py + Math.sin(phi) * len, theme.force, 3.5);
          label(ctx, 'F_Z', px - Math.cos(phi) * len * 0.5 + 12 * Math.sin(phi), py + Math.sin(phi) * len * 0.5 + 12 * Math.cos(phi) + 4, {
            align: 'center',
            size: 13,
            bold: true,
            color: theme.force
          });
        }
        if (show.v) {
          const len = 12 + s * 22;
          arrow(ctx, px, py, px + dir.x * len, py - dir.y * len, theme.velocity, 3);
          label(ctx, 'v', px + dir.x * (len + 12), py - dir.y * (len + 12) + 4, { align: 'center', size: 13, bold: true, color: theme.velocity });
        }
        disc(ctx, px, py, 9 + 7 * Math.sqrt(p.m), theme.object, theme.objectDark, 2);

        // Puck nach innen oder außen ziehen: Bahnradius
        hs.begin();
        if (!frei && env.canSet('r')) {
          const hp = hs.add({
            dist: (x, y) => Math.hypot(x - px, y - py),
            radius: 16 + 7 * Math.sqrt(p.m),
            cursor: 'grab',
            drag: (x, y) => env.set('r', Math.hypot(x - cx, y - cy) / scale)
          });
          if (hs.isHover(hp)) {
            ctx.save();
            ctx.strokeStyle = theme.object;
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, p.r * scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };
  }
};
