/**
 * Teilchenmodell eines Gases: Die Temperatur bestimmt die mittlere
 * Bewegungsenergie der Teilchen. Gezählt werden die Stöße auf die Wand.
 */
import { arrow, box, disc, label, paper, polyline } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

/** Mittlere Geschwindigkeit von Stickstoffmolekülen in m/s bei ϑ in °C. */
export function vMittel(celsius: number): number {
  const T = celsius + 273.15;
  return Math.sqrt((8 * 1.380649e-23 * T) / (Math.PI * 28 * 1.6605e-27));
}

interface Teilchen {
  x: number;
  y: number;
  /** Richtung und relative Geschwindigkeit (Mittel ≈ 1) */
  ux: number;
  uy: number;
}

/** Kleiner, fester Zufallsgenerator: gleiche Startbilder bei jedem Aufruf. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const sim: SimDef = {
  id: 'teilchen',
  title: 'Teilchenmodell: Temperatur und Bewegung',
  summary: 'Gasteilchen in einem Behälter: Temperatur und Teilchenzahl verändern, Geschwindigkeit und Wandstöße beobachten.',
  animated: true,
  thumbTime: 0.5,
  hint: 'Die Teilchen sind stark vergrößert und verlangsamt dargestellt. Die angezeigte Geschwindigkeit gilt für Stickstoffmoleküle.',
  params: [
    { key: 'T', label: 'Temperatur', symbol: 'ϑ', unit: '°C', min: -200, max: 600, step: 10, value: 20, live: true },
    { key: 'N', label: 'Anzahl der Teilchen', symbol: 'N', unit: '', min: 10, max: 150, step: 10, value: 60 }
  ],
  presets: [
    { name: 'flüssiger Stickstoff siedet', values: { T: -200 } },
    { name: 'Zimmer', values: { T: 20 } },
    { name: 'Backofen', values: { T: 220 } }
  ],
  options: [
    { key: 'spur', label: 'Weg eines Teilchens verfolgen', value: true },
    { key: 'pfeile', label: 'Geschwindigkeitspfeile', value: false }
  ],
  plots: [
    { key: 'stoesse', label: 'Wandstöße', xLabel: 't in s', yLabel: 'Stöße je Sekunde', series: [{ label: 'Wandstöße', color: theme.object }] }
  ],
  measures: [
    { key: 'TK', label: 'Temperatur in Kelvin', symbol: 'T', unit: 'K', digits: 0 },
    { key: 'v', label: 'mittlere Geschwindigkeit', symbol: 'v', unit: 'm/s', digits: 0 },
    { key: 'Z', label: 'Wandstöße je Sekunde (Mittel über 3 s)', symbol: 'Z', unit: '1/s', digits: 0 }
  ],

  create(env) {
    const { p, show } = env;
    let parts: Teilchen[] = [];
    let t = 0;
    const hits: number[] = [];
    const trail: number[] = [];
    const buf = { t: [] as number[], z: [] as number[] };
    let lastSample = 0;
    /** Bildschirmgeschwindigkeit (Anteil der Behälterbreite je Sekunde) */
    const speed = () => 0.34 * Math.sqrt((p.T + 273.15) / 293.15);
    const rate = () => hits.filter((h) => h > t - 3).length / Math.min(3, Math.max(t, 0.5));

    return {
      reset() {
        const r = rng(7);
        parts = Array.from({ length: Math.round(p.N) }, () => {
          const a = r() * Math.PI * 2;
          // Geschwindigkeitsverteilung grob wie in einem echten Gas (nicht alle gleich schnell)
          const u = Math.sqrt(-Math.log(1 - r() * 0.98)) * 1.128;
          return { x: 0.04 + r() * 0.92, y: 0.04 + r() * 0.92, ux: Math.cos(a) * u, uy: Math.sin(a) * u };
        });
        t = 0;
        hits.length = 0;
        trail.length = 0;
        buf.t.length = buf.z.length = 0;
        lastSample = 0;
      },
      step(dt) {
        const s = speed() * dt;
        for (const q of parts) {
          q.x += q.ux * s;
          q.y += q.uy * s;
          if (q.x < 0.015 || q.x > 0.985) {
            q.ux = -q.ux;
            q.x = Math.min(0.985, Math.max(0.015, q.x));
            hits.push(t);
          }
          if (q.y < 0.015 || q.y > 0.985) {
            q.uy = -q.uy;
            q.y = Math.min(0.985, Math.max(0.015, q.y));
            hits.push(t);
          }
        }
        t += dt;
        while (hits.length && hits[0] < t - 3) hits.shift();
        if (parts[0]) {
          trail.push(parts[0].x, parts[0].y);
          if (trail.length > 1400) trail.splice(0, 2);
        }
        if (t - lastSample > 0.25) {
          lastSample = t;
          buf.t.push(t);
          buf.z.push(rate());
          if (buf.t.length > 130) {
            buf.t.shift();
            buf.z.shift();
          }
        }
      },
      measure: () => ({ TK: p.T + 273.15, v: vMittel(p.T), Z: t > 0.5 ? rate() : null }),
      plot() {
        const hi = Math.max(30, t);
        return { x: buf.t, ys: [buf.z], xRange: [hi - 30, hi], yRange: [0, Math.max(40, ...buf.z) * 1.15] };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h);
        const size = Math.min(w - 40, h - 30);
        const bw = Math.min(w - 40, size * 1.5);
        const x0 = (w - bw) / 2;
        const y0 = (h - size) / 2;
        box(ctx, x0, y0, bw, size, '#fbf6e9', theme.text, 3, 3);
        const X = (u: number) => x0 + u * bw;
        const Y = (u: number) => y0 + u * size;
        if (show.spur && trail.length > 4) {
          const pts: number[] = [];
          for (let i = 0; i < trail.length; i += 2) pts.push(X(trail[i]), Y(trail[i + 1]));
          polyline(ctx, pts, 'rgba(226, 87, 43, 0.45)', 1.5);
        }
        const r = Math.max(4, Math.min(8, size / 55));
        const hot = Math.min(1, Math.max(0, (p.T + 200) / 800));
        const col = `rgb(${Math.round(40 + 190 * hot)}, ${Math.round(95 - 20 * hot)}, ${Math.round(191 - 150 * hot)})`;
        parts.forEach((q, i) => {
          const first = i === 0 && show.spur;
          if (show.pfeile) {
            const k = bw * speed() * 0.22;
            arrow(ctx, X(q.x), Y(q.y), X(q.x) + q.ux * k, Y(q.y) + q.uy * k, theme.velocity, 1.5);
          }
          disc(ctx, X(q.x), Y(q.y), first ? r + 1.5 : r, first ? theme.object : col, first ? theme.objectDark : undefined, 1.5);
        });
        label(ctx, `${Math.round(p.T + 273.15)} K`, x0 + bw - 10, y0 + 22, { align: 'right', size: 15, bold: true });
      }
    };
  }
};
