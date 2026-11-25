/**
 * Elektrische Energie und Leistung: Ein Wasserkocher erwärmt Wasser.
 * Die Simulation läuft im Zeitraffer; angezeigt wird die echte Zeit.
 */
import { box, fmt, label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const C_WASSER = 4190; // J/(kg·K)
const RAFFER = 20;

/** Zeit in s, um m kg Wasser von t0 auf t1 (°C) zu erwärmen. */
export function heizzeit(P: number, eta: number, m: number, t0: number, t1: number): number {
  return (C_WASSER * m * (t1 - t0)) / (P * eta);
}

export const sim: SimDef = {
  id: 'wasserkocher',
  title: 'Wasserkocher: elektrische Energie',
  summary: 'Leistung, Wassermenge und Wirkungsgrad einstellen und verfolgen, wie die Temperatur mit der zugeführten Energie steigt.',
  animated: true,
  playLabel: 'Einschalten',
  thumbTime: 6,
  hint: `Zeitraffer: Eine Sekunde am Bildschirm entspricht ${RAFFER} Sekunden im Versuch. Der Kocher schaltet bei 100 °C ab.`,
  params: [
    { key: 'P', label: 'Elektrische Leistung', symbol: 'P', unit: 'W', min: 400, max: 2400, step: 100, value: 2000 },
    { key: 'm', label: 'Masse des Wassers', symbol: 'm', unit: 'kg', min: 0.2, max: 1.5, step: 0.1, value: 1 },
    { key: 'T0', label: 'Anfangstemperatur', symbol: 'ϑ_0', unit: '°C', min: 5, max: 40, step: 1, value: 20 },
    { key: 'eta', label: 'Wirkungsgrad', symbol: 'η', unit: '%', min: 50, max: 100, step: 5, value: 100 }
  ],
  options: [
    { key: 'zaehler', label: 'Energiezähler anzeigen', value: true },
    { key: 'fluss', label: 'Energieflussdiagramm', value: false }
  ],
  plots: [
    { key: 'T', label: 'ϑ(t)', xLabel: 't in s', yLabel: 'ϑ in °C', series: [{ label: 'Temperatur', color: theme.force }] },
    { key: 'E', label: 'E(t)', xLabel: 't in s', yLabel: 'E_el in kJ', series: [{ label: 'elektrische Energie', color: theme.velocity }] }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 0 },
    { key: 'T', label: 'Temperatur des Wassers', symbol: 'ϑ', unit: '°C', digits: 1 },
    { key: 'E', label: 'zugeführte elektrische Energie', symbol: 'E_el', unit: 'kJ', digits: 1 }
  ],

  create(env) {
    const { p, show } = env;
    let t = 0;
    let T = 20;
    let n = 0;
    let done = false;
    const buf = { t: [] as number[], T: [] as number[], E: [] as number[] };
    const sample = () => {
      buf.t.push(t);
      buf.T.push(T);
      buf.E.push((p.P * t) / 1000);
    };
    return {
      reset() {
        t = 0;
        T = p.T0;
        n = 0;
        done = false;
        buf.t.length = buf.T.length = buf.E.length = 0;
        sample();
      },
      step(dt) {
        if (done) return;
        const d = dt * RAFFER;
        t += d;
        T += (p.P * (p.eta / 100) * d) / (C_WASSER * p.m);
        if (T >= 100) {
          // exakten Abschaltzeitpunkt treffen
          t = heizzeit(p.P, p.eta / 100, p.m, p.T0, 100);
          T = 100;
          done = true;
          sample();
          env.finish();
        } else if (++n % 6 === 0) sample();
      },
      measure: () => ({ t, T, E: (p.P * t) / 1000 }),
      plot(key) {
        const tEnd = heizzeit(p.P, p.eta / 100, p.m, p.T0, 100);
        return key === 'T'
          ? { x: buf.t, ys: [buf.T], xRange: [0, tEnd * 1.05], yRange: [0, 105] }
          : { x: buf.t, ys: [buf.E], xRange: [0, tEnd * 1.05], yRange: [0, (p.P * tEnd * 1.08) / 1000] };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const table = h - 40;
        line(ctx, 0, table, w, table, theme.text, 2);
        const cx = w * 0.36;
        const kw = Math.min(200, w * 0.3);
        const kh = Math.min(table - 70, 250);
        const top = table - kh - 14;
        const on = env.isRunning() && !done;

        // Sockel und Gefäß
        box(ctx, cx - kw / 2 - 10, table - 14, kw + 20, 14, theme.metalDark, theme.text, 3, 2);
        const fill = (0.3 + 0.6 * ((p.m - 0.2) / 1.3)) * (kh - 18);
        const hot = (T - p.T0) / Math.max(1, 100 - p.T0);
        ctx.fillStyle = `rgb(${Math.round(168 + 60 * hot)}, ${Math.round(211 - 30 * hot)}, ${Math.round(234 - 60 * hot)})`;
        ctx.fillRect(cx - kw / 2 + 2, table - 16 - fill, kw - 4, fill);
        // Heizwendel
        ctx.strokeStyle = on ? theme.object : theme.metalDark;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const x = cx - kw / 2 + 18 + ((kw - 36) * i) / 6;
          const y = table - 26 - (i % 2 ? 9 : 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Blasen
        if (t > 0 && T > 45) {
          const count = Math.round(((T - 45) / 55) * 26);
          for (let i = 0; i < count; i++) {
            const ph = (i * 0.618 + t * 0.03 * (1 + (i % 5) * 0.2)) % 1;
            const bx = cx - kw / 2 + 14 + ((i * 37) % (kw - 28));
            ctx.beginPath();
            ctx.arc(bx, table - 30 - ph * (fill - 20), 2 + (i % 3), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(cx - kw / 2, top, kw, kh);
        // Griff
        ctx.beginPath();
        ctx.moveTo(cx + kw / 2, top + 30);
        ctx.quadraticCurveTo(cx + kw / 2 + 56, top + kh / 2, cx + kw / 2, top + kh - 40);
        ctx.lineWidth = 9;
        ctx.strokeStyle = theme.text;
        ctx.stroke();
        label(ctx, `${fmt(p.m, 1)} kg Wasser`, cx, table - 16 - fill - 8, { align: 'center', size: 12, color: theme.muted });
        box(ctx, cx - 50, top - 28, 100, 22, done ? theme.acceleration : on ? theme.object : theme.metal, theme.text, 11, 1.5);
        label(ctx, done ? 'abgeschaltet' : on ? `EIN · ${fmt(p.P, 0)} W` : 'AUS', cx, top - 12, { align: 'center', size: 12, bold: true, color: done || on ? '#fff' : theme.text });

        // Thermometer
        const tx = cx - kw / 2 - 46;
        const th = kh - 10;
        const ty = table - 30;
        box(ctx, tx - 7, ty - th, 14, th, theme.bg, theme.text, 7, 1.5);
        const lvl = (T / 110) * (th - 16);
        ctx.fillStyle = theme.force;
        ctx.fillRect(tx - 3, ty - 8 - lvl, 6, lvl + 4);
        ctx.beginPath();
        ctx.arc(tx, ty, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (let c = 0; c <= 100; c += 20) {
          const yy = ty - 8 - (c / 110) * (th - 16);
          line(ctx, tx - 13, yy, tx - 8, yy, theme.axis, 1);
          label(ctx, `${c}`, tx - 16, yy + 4, { align: 'right', size: 11, color: theme.muted });
        }
        label(ctx, `${fmt(T, 1)} °C`, tx, ty - th - 8, { align: 'center', size: 13, bold: true, color: theme.force });

        // Energiezähler
        const zx = w * 0.72;
        if (show.zaehler) {
          box(ctx, zx - 86, top + 6, 172, 92, '#e3e6ea', theme.text, 6, 2);
          label(ctx, 'Energiezähler', zx, top + 26, { align: 'center', size: 12, color: theme.muted });
          box(ctx, zx - 70, top + 36, 140, 30, '#16261f', theme.text, 3);
          ctx.font = `600 18px ${theme.mono}`;
          ctx.fillStyle = '#b6f2c9';
          ctx.textAlign = 'right';
          ctx.fillText(`${fmt((p.P * t) / 1000, 1)} kJ`, zx + 62, top + 58);
          label(ctx, `t = ${fmt(t, 0)} s`, zx, top + 86, { align: 'center', size: 13, bold: true });
        }
        if (show.fluss) {
          const fy = top + 130;
          const eta = p.eta / 100;
          const fw = 150;
          label(ctx, 'Energiefluss', zx, fy - 8, { align: 'center', size: 12, color: theme.muted });
          ctx.fillStyle = theme.velocity;
          ctx.fillRect(zx - fw / 2, fy, 40, 60);
          ctx.fillStyle = theme.force;
          ctx.fillRect(zx - fw / 2 + 40, fy, fw - 40, 60 * eta);
          ctx.fillStyle = theme.prediction;
          ctx.fillRect(zx - fw / 2 + 40, fy + 60 * eta, (fw - 40) * 0.6, 60 * (1 - eta));
          label(ctx, 'E_el', zx - fw / 2 + 20, fy + 34, { align: 'center', size: 12, bold: true, color: '#fff' });
          label(ctx, `Wasser ${fmt(p.eta, 0)} %`, zx + 20, fy + 30 * eta + 4, { align: 'center', size: 12, bold: true, color: '#fff' });
          if (eta < 0.95) label(ctx, 'Umgebung', zx + 78, fy + 60 * eta + 30 * (1 - eta) + 4, { size: 11, color: theme.muted, align: 'right' });
        }
      }
    };
  }
};
