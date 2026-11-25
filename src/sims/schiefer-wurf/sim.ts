/**
 * Wurfbewegung ohne Luftwiderstand (waagrechter und schiefer Wurf).
 * Frühere Würfe bleiben als graue Spuren zum Vergleich stehen.
 */
import { niceStep } from '../../lib/engine/canvas';
import { arrow, box, disc, fmt, label, line, paper, polyline } from '../../lib/engine/draw';
import { grip, Handles, point } from '../../lib/engine/handles';
import { theme } from '../../lib/engine/theme';
import type { SimDef, Stage } from '../../lib/sim/types';
import { kennwerte, stateAt, type WurfParams } from './model';

interface Trail {
  x: number[];
  y: number[];
  text: string;
}

export const sim: SimDef = {
  id: 'wurf',
  title: 'Wurfbewegung',
  summary: 'Abwurfgeschwindigkeit, Winkel und Höhe einstellen, Bahnkurven vergleichen, Geschwindigkeit in Komponenten zerlegen.',
  hint: 'Vor dem Abwurf: Die Spitze des Geschwindigkeitspfeils lässt sich ziehen (Betrag und Richtung), die Kugel selbst nach oben und unten (Abwurfhöhe).',
  animated: true,
  playLabel: 'Abwerfen',
  thumbTime: 0.75,
  params: [
    { key: 'v0', label: 'Abwurfgeschwindigkeit', symbol: 'v_0', unit: 'm/s', min: 1, max: 30, step: 0.5, value: 12 },
    { key: 'alpha', label: 'Abwurfwinkel', symbol: 'α', unit: '°', min: 0, max: 90, step: 1, value: 45 },
    { key: 'h0', label: 'Abwurfhöhe', symbol: 'h_0', unit: 'm', min: 0, max: 20, step: 0.5, value: 0 },
    { key: 'g', label: 'Fallbeschleunigung', symbol: 'g', unit: 'm/s²', min: 1, max: 25, step: 0.01, value: 9.81 }
  ],
  presets: [
    { name: 'Erde', values: { g: 9.81 } },
    { name: 'Mond', values: { g: 1.62 } },
    { name: 'Mars', values: { g: 3.71 } },
    { name: 'Jupiter', values: { g: 24.79 } }
  ],
  options: [
    { key: 'vektoren', label: 'Geschwindigkeitspfeile mit Komponenten', value: true },
    { key: 'vorhersage', label: 'Bahnkurve vorab anzeigen', value: false },
    { key: 'spuren', label: 'Frühere Würfe zum Vergleich behalten', value: true }
  ],
  plots: [
    { key: 'y', label: 'y(t)', xLabel: 't in s', yLabel: 'y in m', series: [{ label: 'Höhe', color: theme.object }] },
    { key: 'x', label: 'x(t)', xLabel: 't in s', yLabel: 'x in m', series: [{ label: 'Weite', color: theme.acceleration }] },
    { key: 'vy', label: 'v_y(t)', xLabel: 't in s', yLabel: 'v_y in m/s', series: [{ label: 'senkrecht', color: theme.velocityY }] },
    { key: 'vx', label: 'v_x(t)', xLabel: 't in s', yLabel: 'v_x in m/s', series: [{ label: 'waagrecht', color: theme.velocityX }] }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 2 },
    { key: 'x', label: 'Weite', symbol: 'x', unit: 'm', digits: 2 },
    { key: 'y', label: 'Höhe', symbol: 'y', unit: 'm', digits: 2 },
    { key: 'v', label: 'Betrag der Geschwindigkeit', symbol: 'v', unit: 'm/s', digits: 2 },
    { key: 'flugzeit', label: 'Flugzeit', symbol: 't_F', unit: 's', digits: 2, readout: false },
    { key: 'wurfweite', label: 'Wurfweite', symbol: 'x_W', unit: 'm', digits: 2, readout: false },
    { key: 'hmax', label: 'größte Höhe', symbol: 'h_max', unit: 'm', digits: 2, readout: false }
  ],

  create(env) {
    const { p, show } = env;
    let t = 0;
    let n = 0;
    let landed = false;
    const buf = { t: [] as number[], x: [] as number[], y: [] as number[], vx: [] as number[], vy: [] as number[] };
    let old: Trail[] = [];
    const P = (): WurfParams => ({ v0: p.v0, angleDeg: p.alpha, h0: p.h0, g: p.g });
    let par = P();
    let k = kennwerte(par);

    function sample() {
      const s = stateAt(par, t);
      buf.t.push(t);
      buf.x.push(s.x);
      buf.y.push(Math.max(0, s.y));
      buf.vx.push(s.vx);
      buf.vy.push(s.vy);
    }

    const M = { l: 52, r: 24, t: 24, b: 44 };
    function fit(g: Stage) {
      let maxX = Math.max(k.wurfweite, 4);
      let maxY = Math.max(k.maxHoehe, 2);
      for (const o of old) {
        maxX = Math.max(maxX, o.x[o.x.length - 1] ?? 0);
        maxY = Math.max(maxY, ...o.y);
      }
      const scale = Math.min((g.w - M.l - M.r) / (maxX * 1.06), (g.h - M.t - M.b) / (maxY * 1.12));
      return { scale, ox: M.l, oy: g.h - M.b };
    }

    const hs = new Handles();
    const editable = () => t === 0 && !env.isRunning();
    return {
      pointer: (kind, x, y) => (editable() ? hs.pointer(kind, x, y) : undefined),
      reset() {
        if (show.spuren && buf.x.length > 1 && t > 0)
          old = [...old.slice(-4), { x: buf.x.slice(), y: buf.y.slice(), text: `${fmt(par.angleDeg, 0)}°, ${fmt(par.v0, 1)} m/s` }];
        if (!show.spuren) old = [];
        par = P();
        k = kennwerte(par);
        t = 0;
        n = 0;
        landed = false;
        for (const a of Object.values(buf)) a.length = 0;
        sample();
      },
      step(dt) {
        if (landed) return;
        t += dt;
        if (t >= k.flugzeit) {
          t = k.flugzeit;
          sample();
          landed = true;
          env.finish();
        } else if (++n % 4 === 0) sample();
      },
      measure() {
        const s = stateAt(par, t);
        return {
          t,
          x: s.x,
          y: Math.max(0, s.y),
          v: Math.hypot(s.vx, s.vy),
          flugzeit: landed ? k.flugzeit : null,
          wurfweite: landed ? k.wurfweite : null,
          hmax: landed ? k.maxHoehe : null
        };
      },
      plot: (key) => ({ x: buf.t, ys: [buf[key as 'x' | 'y' | 'vx' | 'vy']], xRange: [0, Math.max(k.flugzeit, 0.1)] }),
      draw(g) {
        const { ctx, w, h } = g;
        const { scale, ox, oy } = fit(g);
        const X = (m: number) => ox + m * scale;
        const Y = (m: number) => oy - m * scale;
        paper(ctx, w, h);

        const step = niceStep(70 / scale);
        ctx.lineWidth = 1;
        ctx.strokeStyle = theme.grid;
        ctx.beginPath();
        for (let x = 0; X(x) <= w; x += step) {
          ctx.moveTo(Math.round(X(x)) + 0.5, 0);
          ctx.lineTo(Math.round(X(x)) + 0.5, oy);
        }
        for (let y = 0; Y(y) >= 0; y += step) {
          ctx.moveTo(ox, Math.round(Y(y)) + 0.5);
          ctx.lineTo(w, Math.round(Y(y)) + 0.5);
        }
        ctx.stroke();

        ctx.fillStyle = theme.groundFill;
        ctx.fillRect(0, oy, w, h - oy);
        line(ctx, 0, oy, w, oy, theme.ground, 2);
        if (par.h0 > 0) box(ctx, ox - 22, Y(par.h0), 22, par.h0 * scale, '#e9e3d3', theme.metalDark);

        const d = step < 1 ? 1 : 0;
        for (let x = step; X(x) <= w - 10; x += step)
          label(ctx, fmt(x, d), X(x), oy + 16, { align: 'center', color: theme.muted, size: 12 });
        for (let y = step; Y(y) >= 12; y += step)
          label(ctx, fmt(y, d), ox - 8, Y(y) + 4, { align: 'right', color: theme.muted, size: 12 });
        label(ctx, 'x in m', w - M.r, oy + 34, { align: 'right', color: theme.muted, size: 12 });
        label(ctx, 'y in m', 8, 16, { color: theme.muted, size: 12 });

        const path = (xs: number[], ys: number[]) => {
          const pts: number[] = [];
          for (let i = 0; i < xs.length; i++) pts.push(X(xs[i]), Y(ys[i]));
          return pts;
        };
        if (show.vorhersage) {
          const xs: number[] = [];
          const ys: number[] = [];
          for (let i = 0; i <= 80; i++) {
            const s = stateAt(par, (k.flugzeit * i) / 80);
            xs.push(s.x);
            ys.push(Math.max(0, s.y));
          }
          polyline(ctx, path(xs, ys), theme.prediction, 2, [6, 6]);
        }
        old.forEach((o, i) => {
          ctx.save();
          ctx.globalAlpha = 0.3 + (0.4 * (i + 1)) / old.length;
          polyline(ctx, path(o.x, o.y), theme.prediction, 2);
          let top = 0;
          for (let j = 1; j < o.y.length; j++) if (o.y[j] > o.y[top]) top = j;
          label(ctx, o.text, X(o.x[top]), Y(o.y[top]) - 8, { align: 'center', size: 11, color: theme.muted });
          ctx.restore();
        });
        polyline(ctx, path(buf.x, buf.y), theme.trail, 2.5);

        const s = stateAt(par, t);
        const bx = X(s.x);
        const by = Y(Math.max(0, s.y));

        if (t === 0 && par.angleDeg > 0) {
          const a = (par.angleDeg * Math.PI) / 180;
          line(ctx, bx, by, bx + 70, by, theme.muted, 1.2, [4, 4]);
          ctx.strokeStyle = theme.muted;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, by, 34, -a, 0);
          ctx.stroke();
          label(ctx, `α = ${fmt(par.angleDeg, 0)}°`, bx + 40, by - 8 - 10 * Math.sin(a), { size: 13 });
        }
        if (landed) {
          if (par.angleDeg > 0) {
            const top = stateAt(par, k.steigzeit);
            line(ctx, X(top.x), Y(top.y), X(top.x), oy, theme.muted, 1, [3, 4]);
            label(ctx, `h_max = ${fmt(k.maxHoehe, 2)} m`, X(top.x) + 6, Y(top.y) - 10, { size: 12 });
          }
          label(ctx, `Wurfweite ${fmt(k.wurfweite, 2)} m`, bx - 14, by - 14, { align: 'right', size: 12, bold: true });
        }
        // Vor dem Abwurf: Pfeilspitze ziehen (Geschwindigkeit und Winkel), Kugel ziehen (Abwurfhöhe)
        const vs = (Math.min(w, h) * 0.5) / 30;
        hs.begin();
        if (editable()) {
          if (env.canSet('v0') || env.canSet('alpha')) {
            const a0 = (par.angleDeg * Math.PI) / 180;
            const tx = bx + Math.cos(a0) * par.v0 * vs;
            const ty = by - Math.sin(a0) * par.v0 * vs;
            const hv = hs.add({
              dist: point(tx, ty),
              radius: 18,
              cursor: 'crosshair',
              drag: (x, y) => {
                const dx = x - bx;
                const dy = by - y;
                if (env.canSet('alpha')) {
                  env.set('alpha', (Math.atan2(Math.max(dy, 0), Math.max(dx, 0)) * 180) / Math.PI);
                  env.set('v0', Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) / vs);
                } else env.set('v0', Math.max(dx, 0) / Math.cos(a0) / vs);
              }
            });
            grip(ctx, tx, ty, 'hv', hs.isHover(hv));
          }
          if (env.canSet('h0')) {
            const hh = hs.add({ dist: point(bx, by), radius: 14, cursor: 'ns-resize', drag: (_x, y) => env.set('h0', (oy - y) / scale) });
            if (hs.isHover(hh)) grip(ctx, bx - 26, by, 'v', true);
          }
        }
        if (show.vektoren && !landed) {
          arrow(ctx, bx, by, bx + s.vx * vs, by, theme.velocityX, 2);
          arrow(ctx, bx, by, bx, by - s.vy * vs, theme.velocityY, 2);
          arrow(ctx, bx, by, bx + s.vx * vs, by - s.vy * vs, theme.velocity, 3);
          label(ctx, 'v', bx + s.vx * vs + 6, by - s.vy * vs - 6, { color: theme.velocity, bold: true, size: 14 });
          label(ctx, 'v_x', bx + s.vx * vs + 4, by + 16, { color: theme.velocityX, size: 13 });
          if (Math.abs(s.vy * vs) > 10)
            label(ctx, 'v_y', bx + 6, by - s.vy * vs + (s.vy > 0 ? -4 : 14), { color: theme.velocityY, size: 13 });
        }
        disc(ctx, bx, by, 9, theme.object, theme.objectDark);
      }
    };
  }
};
