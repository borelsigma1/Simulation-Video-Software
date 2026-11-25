/**
 * Federpendel (vertikal). Der Körper lässt sich mit Maus/Finger greifen und
 * auslenken. Die Periodendauer wird wie mit einer Stoppuhr an den
 * Durchgängen durch die Ruhelage gemessen.
 */
import { arrow, box, fmt, hatch, label, line, paper, spring } from '../../lib/engine/draw';
import { theme } from '../../lib/engine/theme';
import type { SimDef, Stage } from '../../lib/sim/types';
import { acceleration, energien, PeriodenMesser, rk4Step, type PendelState } from './model';

const S_MAX = 0.3;
const WINDOW = 10;

export const sim: SimDef = {
  id: 'federpendel',
  title: 'Federpendel',
  summary: 'Körper an einer Schraubenfeder: Periodendauer messen, s(t), v(t), a(t) und Energien verfolgen.',
  animated: true,
  playLabel: 'Loslassen',
  thumbTime: 0.9,
  hint: 'Der Körper lässt sich mit Maus oder Finger ziehen. Die Periodendauer wird an den Durchgängen durch die Ruhelage gemessen (Mittel über bis zu 5 Schwingungen).',
  params: [
    { key: 'm', label: 'Masse', symbol: 'm', unit: 'kg', min: 0.1, max: 2, step: 0.05, value: 0.5, live: true },
    { key: 'D', label: 'Federhärte', symbol: 'D', unit: 'N/m', min: 5, max: 100, step: 1, value: 20, live: true },
    { key: 'b', label: 'Dämpfung', symbol: 'b', unit: 'kg/s', min: 0, max: 2, step: 0.05, value: 0, live: true },
    { key: 's0', label: 'Startauslenkung', symbol: 's_0', unit: 'm', min: 0.02, max: S_MAX, step: 0.01, value: 0.15 }
  ],
  options: [
    { key: 'v', label: 'Geschwindigkeitspfeil', value: true },
    { key: 'F', label: 'Kraftpfeil (rücktreibende Kraft)', value: true }
  ],
  plots: [
    { key: 's', label: 's(t)', xLabel: 't in s', yLabel: 's in m', series: [{ label: 'Auslenkung', color: theme.object }] },
    { key: 'v', label: 'v(t)', xLabel: 't in s', yLabel: 'v in m/s', series: [{ label: 'Geschwindigkeit', color: theme.velocity }] },
    { key: 'a', label: 'a(t)', xLabel: 't in s', yLabel: 'a in m/s²', series: [{ label: 'Beschleunigung', color: theme.acceleration }] },
    {
      key: 'E',
      label: 'Energien',
      xLabel: 't in s',
      yLabel: 'E in J',
      series: [
        { label: 'Bewegungsenergie', color: theme.velocity },
        { label: 'Spannenergie', color: theme.object },
        { label: 'Summe', color: theme.text }
      ]
    }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 2 },
    { key: 's', label: 'Auslenkung aus der Ruhelage', symbol: 's', unit: 'cm', digits: 1 },
    { key: 'v', label: 'Geschwindigkeit', symbol: 'v', unit: 'm/s', digits: 2 },
    { key: 'T', label: 'Periodendauer (gemessen)', symbol: 'T', unit: 's', digits: 3 },
    { key: 'f', label: 'Frequenz (gemessen)', symbol: 'f', unit: 'Hz', digits: 3, readout: false },
    { key: 'amp', label: 'Amplitude', symbol: 'ŝ', unit: 'm', digits: 3, readout: false }
  ],

  create(env) {
    const { p, show } = env;
    const st: PendelState = { t: 0, s: 0, v: 0 };
    const messer = new PeriodenMesser();
    const buf = { t: [] as number[], s: [] as number[], v: [] as number[], a: [] as number[], ek: [] as number[], ep: [] as number[], eg: [] as number[] };
    let n = 0;
    let ampRef = 0.15;
    let dragging = false;
    let grab = 0;
    let wasRunning = false;

    const P = () => ({ m: p.m, D: p.D, b: p.b });
    const size = () => 30 + 24 * Math.sqrt(p.m);
    const geo = (g: Stage) => {
      const ceil = 28;
      const yEq = Math.round(g.h * 0.5);
      const scale = Math.max(40, Math.min((yEq - ceil - 82) / S_MAX, (g.h - 46 - yEq) / S_MAX));
      return { ceil, yEq, scale, cx: Math.round(g.w * 0.42) };
    };

    function sample() {
      const e = energien(P(), st);
      buf.t.push(st.t);
      buf.s.push(st.s);
      buf.v.push(st.v);
      buf.a.push(acceleration(P(), st.s, st.v));
      buf.ek.push(e.kin);
      buf.ep.push(e.pot);
      buf.eg.push(e.ges);
      if (buf.t.length > WINDOW * 60 + 30) for (const a of Object.values(buf)) a.shift();
    }

    return {
      reset() {
        st.t = 0;
        st.s = p.s0;
        st.v = 0;
        n = 0;
        ampRef = p.s0;
        messer.reset();
        for (const a of Object.values(buf)) a.length = 0;
        sample();
      },
      update() {
        messer.reset();
      },
      step(dt) {
        if (dragging) return;
        rk4Step(P(), st, dt);
        messer.update(st.t, st.s);
        if (++n % 4 === 0) sample();
      },
      measure: () => ({
        t: st.t,
        s: st.s * 100,
        v: st.v,
        T: messer.periode,
        f: messer.periode ? 1 / messer.periode : null,
        amp: messer.amplitude
      }),
      plot(key) {
        const w = Math.sqrt(p.D / p.m);
        const A = ampRef * 1.15;
        const hi = Math.max(WINDOW, st.t);
        const xRange: [number, number] = [hi - WINDOW, hi];
        if (key === 'E') return { x: buf.t, ys: [buf.ek, buf.ep, buf.eg], xRange, yRange: [0, 0.5 * p.D * A * A] };
        const k = key === 'v' ? w : key === 'a' ? w * w : 1;
        return { x: buf.t, ys: [buf[key as 's' | 'v' | 'a']], xRange, yRange: [-A * k, A * k] };
      },
      pointer(kind, x, y, g) {
        const { yEq, scale, cx } = geo(g);
        const top = yEq + st.s * scale - size() / 2;
        const over = Math.abs(x - cx) < size() / 2 + 14 && y > top - 14 && y < top + size() + 14;
        if (kind === 'down') {
          if (!over) return;
          dragging = true;
          wasRunning = env.isRunning();
          grab = y - top;
          return 'grabbing';
        }
        if (kind === 'move') {
          if (!dragging) return over ? 'grab' : '';
          st.s = Math.max(-S_MAX, Math.min(S_MAX, (y - grab + size() / 2 - yEq) / scale));
          st.v = 0;
          return 'grabbing';
        }
        if (dragging) {
          dragging = false;
          messer.reset();
          ampRef = Math.max(Math.abs(st.s), 0.02);
          if (wasRunning || st.t === 0) env.play();
        }
      },
      draw(g) {
        const { ctx, w, h } = g;
        const { ceil, yEq, scale, cx } = geo(g);
        paper(ctx, w, h, true);
        hatch(ctx, cx - 90, 0, 180, ceil);
        line(ctx, cx - 90, ceil, cx + 90, ceil, theme.text, 2);

        // Maßstab (cm, 0 = Ruhelage)
        const rx = cx + 120;
        const cm = scale / 100;
        line(ctx, rx, yEq - S_MAX * scale, rx, yEq + S_MAX * scale, theme.axis, 1);
        for (let c = -30; c <= 30; c += cm * 5 < 14 ? 10 : 5) {
          const yy = yEq + c * cm;
          line(ctx, rx, yy, rx + (c % 10 === 0 ? 10 : 6), yy, theme.axis, 1);
        }
        for (let c = -30; c <= 30; c += 10)
          label(ctx, `${c > 0 ? '+' : ''}${c}`, rx + 14, yEq + c * cm + 4, { size: 12, color: theme.muted });
        label(ctx, 's in cm', rx, yEq - S_MAX * scale - 10, { size: 12, color: theme.muted });
        line(ctx, cx - 110, yEq, rx, yEq, theme.prediction, 1.2, [5, 5]);
        label(ctx, 'Ruhelage', cx - 114, yEq + 4, { size: 12, color: theme.muted, align: 'right' });

        const sz = size();
        const top = yEq + st.s * scale - sz / 2;
        spring(ctx, cx, ceil, cx, top, 14, 13);
        box(ctx, cx - sz / 2, top, sz, sz, theme.object, theme.objectDark, 5, 2);
        label(ctx, `${fmt(p.m, 2)} kg`, cx, top + sz / 2 + 4, { align: 'center', color: '#fff', bold: true, size: 12 });

        const my = top + sz / 2;
        if (show.F) {
          const F = -p.D * st.s - p.b * st.v;
          const k = (S_MAX * scale * 0.6) / Math.max(p.D * S_MAX * 0.5, 1e-6);
          arrow(ctx, cx - sz / 2 - 14, my, cx - sz / 2 - 14, my + F * k, theme.force, 3);
          if (Math.abs(F * k) > 12) label(ctx, 'F', cx - sz / 2 - 32, my + F * k * 0.5 + 4, { color: theme.force, bold: true, size: 14 });
        }
        if (show.v) {
          const k = (S_MAX * scale * 0.6) / Math.max(Math.sqrt(p.D / p.m) * S_MAX * 0.5, 1e-6);
          arrow(ctx, cx + sz / 2 + 14, my, cx + sz / 2 + 14, my + st.v * k, theme.velocity, 3);
          if (Math.abs(st.v * k) > 12) label(ctx, 'v', cx + sz / 2 + 22, my + st.v * k * 0.5 + 4, { color: theme.velocity, bold: true, size: 14 });
        }
      }
    };
  }
};
