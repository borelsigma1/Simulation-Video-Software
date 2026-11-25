/**
 * Energieumwandlung auf einer Bahn: Ein Wagen rollt reibungsfrei oder mit
 * Reibung durch eine Mulde bzw. über einen Hügel. Säulen zeigen Höhenenergie,
 * Bewegungsenergie und innere Energie.
 */
import { arrow, box, disc, fmt, label, line, paper, polyline } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef, Stage } from '../lib/sim/types';

const G = 9.81;
const X_MAX = 4.3;

/** Bahnprofil y(x) in m: 0 = Mulde, 1 = Hügel zwischen zwei Mulden. */
export function bahn(form: number, x: number): number {
  return form === 0 ? 0.25 * x * x : 0.045 * x ** 4 - 0.5 * x * x + 1.389;
}
export function steigung(form: number, x: number): number {
  return form === 0 ? 0.5 * x : 0.18 * x ** 3 - x;
}
/** Startpunkt links, an dem die Bahn die Höhe h hat. */
export function startX(form: number, h: number): number {
  let lo = -X_MAX;
  let hi = form === 0 ? 0 : -2.357;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (bahn(form, mid) > h) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface WagenState {
  x: number;
  /** Bahngeschwindigkeit, positiv nach rechts */
  v: number;
}

/** Ein Schritt entlang der Bahn (Tangentialbeschleunigung aus Hangabtrieb und Reibung). */
export function schritt(form: number, mu: number, st: WagenState, dt: number): void {
  const acc = (x: number, v: number) => {
    const th = Math.atan(steigung(form, x));
    return -G * Math.sin(th) - (v === 0 ? 0 : Math.sign(v) * mu * G * Math.cos(th));
  };
  // Halbschritt-Verfahren (Mittelpunktsregel)
  const th0 = Math.atan(steigung(form, st.x));
  const a0 = acc(st.x, st.v);
  const xm = st.x + 0.5 * dt * st.v * Math.cos(th0);
  const vm = st.v + 0.5 * dt * a0;
  const thm = Math.atan(steigung(form, xm));
  const v1 = st.v + dt * acc(xm, vm);
  st.x += dt * vm * Math.cos(thm);
  // Reibung kann die Bewegung höchstens stoppen, nicht umkehren
  st.v = st.v !== 0 && Math.sign(v1) !== Math.sign(st.v) && mu > 0 && Math.abs(G * Math.sin(thm)) <= mu * G * Math.cos(thm) ? 0 : v1;
}

export const sim: SimDef = {
  id: 'energiebahn',
  title: 'Energieumwandlung auf der Bahn',
  summary: 'Ein Wagen rollt durch eine Mulde oder über einen Hügel: Höhenenergie, Bewegungsenergie und innere Energie im Blick.',
  animated: true,
  playLabel: 'Loslassen',
  thumbTime: 0.9,
  params: [
    {
      key: 'form',
      label: 'Bahn',
      unit: '',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'Mulde' },
        { value: 1, label: 'Hügel' }
      ]
    },
    { key: 'h0', label: 'Starthöhe', symbol: 'h_0', unit: 'm', min: 0.5, max: 4, step: 0.1, value: 3 },
    { key: 'm', label: 'Masse des Wagens', symbol: 'm', unit: 'kg', min: 10, max: 100, step: 5, value: 50 },
    { key: 'mu', label: 'Reibungszahl', symbol: 'μ', unit: '', min: 0, max: 0.2, step: 0.01, value: 0, live: true }
  ],
  options: [
    { key: 'saeulen', label: 'Energiesäulen', value: true },
    { key: 'v', label: 'Geschwindigkeitspfeil', value: true },
    { key: 'hoehe', label: 'Höhenlinie der Starthöhe', value: true }
  ],
  plots: [
    {
      key: 'E',
      label: 'Energien',
      xLabel: 't in s',
      yLabel: 'E in J',
      series: [
        { label: 'Höhenenergie', color: theme.acceleration },
        { label: 'Bewegungsenergie', color: theme.velocity },
        { label: 'innere Energie', color: theme.force }
      ]
    },
    { key: 'v', label: 'v(t)', xLabel: 't in s', yLabel: '|v| in m/s', series: [{ label: 'Geschwindigkeit', color: theme.velocity }] }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 1 },
    { key: 'h', label: 'Höhe', symbol: 'h', unit: 'm', digits: 2 },
    { key: 'v', label: 'Betrag der Geschwindigkeit', symbol: 'v', unit: 'm/s', digits: 2 },
    { key: 'Eh', label: 'Höhenenergie', symbol: 'E_h', unit: 'J', digits: 0 },
    { key: 'Ekin', label: 'Bewegungsenergie', symbol: 'E_kin', unit: 'J', digits: 0 },
    { key: 'Ei', label: 'innere Energie (durch Reibung)', symbol: 'E_i', unit: 'J', digits: 0, readout: false },
    { key: 'vmax', label: 'größte bisher erreichte Geschwindigkeit', symbol: 'v_max', unit: 'm/s', digits: 2, readout: false }
  ],

  create(env) {
    const { p, show } = env;
    const st: WagenState = { x: 0, v: 0 };
    let t = 0;
    let n = 0;
    let E0 = 0;
    let still = 0;
    let vmax = 0;
    const WINDOW = 20;
    const buf = { t: [] as number[], eh: [] as number[], ek: [] as number[], ei: [] as number[], v: [] as number[] };
    const en = () => {
      const eh = p.m * G * bahn(p.form, st.x);
      const ek = 0.5 * p.m * st.v * st.v;
      return { eh, ek, ei: Math.max(0, E0 - eh - ek) };
    };
    const sample = () => {
      const e = en();
      buf.t.push(t);
      buf.eh.push(e.eh);
      buf.ek.push(e.ek);
      buf.ei.push(e.ei);
      buf.v.push(Math.abs(st.v));
      if (buf.t.length > WINDOW * 30 + 10) for (const a of Object.values(buf)) a.shift();
    };
    const view = (g: Stage) => {
      const right = show.saeulen ? 150 : 20;
      const scale = Math.min((g.w - 64 - right) / (2 * X_MAX), (g.h - 70) / 4.9);
      return { scale, ox: 44 + X_MAX * scale, oy: g.h - 34, right };
    };

    return {
      reset() {
        st.x = startX(p.form, p.h0);
        st.v = 0;
        t = 0;
        n = 0;
        still = 0;
        vmax = 0;
        E0 = p.m * G * bahn(p.form, st.x);
        for (const a of Object.values(buf)) a.length = 0;
        sample();
      },
      step(dt) {
        schritt(p.form, p.mu, st, dt);
        st.x = Math.max(-X_MAX, Math.min(X_MAX, st.x));
        t += dt;
        vmax = Math.max(vmax, Math.abs(st.v));
        if (++n % 8 === 0) sample();
        still = Math.abs(st.v) < 0.01 && Math.abs(Math.tan(Math.atan(steigung(p.form, st.x)))) <= p.mu + 1e-9 ? still + dt : 0;
        if (still > 0.4 && p.mu > 0) {
          st.v = 0;
          sample();
          env.finish();
        }
      },
      measure() {
        const e = en();
        return { t, h: bahn(p.form, st.x), v: Math.abs(st.v), Eh: e.eh, Ekin: e.ek, Ei: e.ei, vmax: t > 0 ? vmax : null };
      },
      plot(key) {
        const hi = Math.max(WINDOW, t);
        const xRange: [number, number] = [hi - WINDOW, hi];
        if (key === 'v') return { x: buf.t, ys: [buf.v], xRange, yRange: [0, Math.sqrt(2 * G * p.h0) * 1.1] };
        return { x: buf.t, ys: [buf.eh, buf.ek, buf.ei], xRange, yRange: [0, E0 * 1.08] };
      },
      draw(g) {
        const { ctx, w, h } = g;
        const { scale, ox, oy, right } = view(g);
        const X = (m: number) => ox + m * scale;
        const Y = (m: number) => oy - m * scale;
        paper(ctx, w, h, true);

        // Höhenskala
        for (let m = 0; m <= 4; m++) {
          line(ctx, 8, Y(m), X(X_MAX) + 6, Y(m), theme.grid, 1);
          label(ctx, `${m} m`, 8, Y(m) - 4, { size: 11, color: theme.muted });
        }
        // Bahn mit Untergrund
        const pts: number[] = [];
        for (let i = 0; i <= 120; i++) {
          const x = -X_MAX + (2 * X_MAX * i) / 120;
          pts.push(X(x), Y(bahn(p.form, x)));
        }
        ctx.beginPath();
        ctx.moveTo(pts[0], h);
        for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.lineTo(pts[pts.length - 2], h);
        ctx.closePath();
        ctx.fillStyle = theme.groundFill;
        ctx.fill();
        polyline(ctx, pts, theme.text, 3);

        if (show.hoehe) {
          line(ctx, X(-X_MAX), Y(p.h0), X(X_MAX), Y(p.h0), theme.acceleration, 1.4, [7, 5]);
          label(ctx, `h_0 = ${fmt(p.h0, 1)} m`, X(0), Y(p.h0) - 6, { align: 'center', size: 12, color: theme.acceleration, bold: true });
        }

        // Wagen
        const th = Math.atan(steigung(p.form, st.x));
        ctx.save();
        ctx.translate(X(st.x), Y(bahn(p.form, st.x)));
        ctx.rotate(-th);
        box(ctx, -17, -23, 34, 15, theme.object, theme.objectDark, 3, 2);
        disc(ctx, -10, -6, 5.5, theme.bg, theme.text, 2);
        disc(ctx, 10, -6, 5.5, theme.bg, theme.text, 2);
        if (show.v && Math.abs(st.v) > 0.05) {
          const len = st.v * Math.min(9, (0.2 * w) / Math.sqrt(2 * G * 4));
          arrow(ctx, 0, -32, len, -32, theme.velocity, 3);
        }
        ctx.restore();

        // Energiesäulen
        if (show.saeulen) {
          const e = en();
          const bx = w - right + 14;
          const bh = h - 96;
          const base = h - 50;
          const cols: Array<[string, number, string]> = [
            ['E_h', e.eh, theme.acceleration],
            ['E_kin', e.ek, theme.velocity],
            ['E_i', e.ei, theme.force]
          ];
          box(ctx, bx - 10, base - bh - 26, right - 12, bh + 66, theme.bg, theme.gridStrong, 4, 1);
          cols.forEach(([name, val, col], i) => {
            const x = bx + i * 42;
            const hh = E0 > 0 ? (val / E0) * bh : 0;
            box(ctx, x, base - bh, 28, bh, '#f3eee0', theme.gridStrong, 0, 1);
            ctx.fillStyle = col;
            ctx.fillRect(x, base - hh, 28, hh);
            label(ctx, name, x + 14, base + 18, { align: 'center', size: 13, bold: true, color: col });
          });
          label(ctx, `gesamt ${fmt(E0, 0)} J`, bx + 56, base - bh - 8, { align: 'center', size: 11.5, color: theme.muted });
        }
      }
    };
  }
};
