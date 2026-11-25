/**
 * Auf- und Entladen eines Kondensators über einen Widerstand (RC-Glied).
 */
import { arrow, box, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { Handles, point } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

/** Zeitkonstante in s (R in kΩ, C in µF). */
export const tau = (RkOhm: number, CMikro: number): number => RkOhm * 1e3 * CMikro * 1e-6;
/** Kondensatorspannung zur Zeit t. */
export const spannung = (U0: number, t: number, tau_: number, laden: boolean): number =>
  laden ? U0 * (1 - Math.exp(-t / tau_)) : U0 * Math.exp(-t / tau_);

export const sim: SimDef = {
  id: 'rc',
  title: 'Kondensator laden und entladen',
  summary: 'Ein Kondensator wird über einen Widerstand geladen oder entladen: zeitlichen Verlauf von Spannung und Stromstärke aufnehmen.',
  animated: true,
  playLabel: 'Schalter umlegen',
  thumbTime: 2.5,
  hint: 'Der Umschalter S lässt sich in der Zeichnung antippen, um den Vorgang zu starten. Die Messung endet nach fünf Zeitkonstanten. Zum Ablesen einzelner Werte die Simulation anhalten oder schrittweise laufen lassen.',
  params: [
    {
      key: 'vorgang',
      label: 'Vorgang',
      unit: '',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'Laden' },
        { value: 1, label: 'Entladen' }
      ]
    },
    { key: 'U0', label: 'Spannung der Quelle', symbol: 'U_0', unit: 'V', min: 2, max: 12, step: 0.5, value: 10 },
    { key: 'R', label: 'Widerstand', symbol: 'R', unit: 'kΩ', min: 1, max: 50, step: 1, value: 10 },
    { key: 'C', label: 'Kapazität', symbol: 'C', unit: 'µF', min: 100, max: 1000, step: 10, value: 470 }
  ],
  options: [
    { key: 'ladung', label: 'Ladung auf den Platten andeuten', value: true },
    { key: 'strom', label: 'Bewegung der Elektronen andeuten', value: true },
    { key: 'marke', label: 'Hilfslinien bei 63 % bzw. 37 % von U₀', value: false }
  ],
  plots: [
    {
      key: 'U',
      label: 'U(t)',
      xLabel: 't in s',
      yLabel: 'U in V',
      series: [
        { label: 'Kondensator U_C', color: theme.object },
        { label: 'Widerstand U_R', color: theme.velocity },
        { label: 'Hilfslinie', color: theme.prediction }
      ]
    },
    { key: 'I', label: 'I(t)', xLabel: 't in s', yLabel: 'I in mA', series: [{ label: 'Stromstärke', color: theme.acceleration }] }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 2 },
    { key: 'UC', label: 'Spannung am Kondensator', symbol: 'U_C', unit: 'V', digits: 2 },
    { key: 'I', label: 'Stromstärke (Betrag)', symbol: 'I', unit: 'mA', digits: 3 },
    { key: 'Q', label: 'Ladung des Kondensators', symbol: 'Q', unit: 'mC', digits: 2, readout: false }
  ],

  create(env) {
    const hs = new Handles();
    const { p, show } = env;
    let t = 0;
    let n = 0;
    let lauf = 0; // Weg der Elektronen-Punkte
    const buf = { t: [] as number[], uc: [] as number[], ur: [] as number[], i: [] as number[] };
    const T = () => tau(p.R, p.C);
    const laden = () => p.vorgang === 0;
    const uc = () => spannung(p.U0, t, T(), laden());
    /** Stromstärke in mA (Betrag) */
    const strom = () => (env.isRunning() || t > 0 ? (p.U0 / p.R) * Math.exp(-t / T()) : 0);
    const sample = () => {
      buf.t.push(t);
      buf.uc.push(uc());
      buf.ur.push(p.U0 * Math.exp(-t / T()));
      buf.i.push((p.U0 / p.R) * Math.exp(-t / T()));
    };
    return {
      reset() {
        t = 0;
        n = 0;
        lauf = 0;
        buf.t.length = buf.uc.length = buf.ur.length = buf.i.length = 0;
      },
      step(dt) {
        if (buf.t.length === 0) sample();
        t += dt;
        lauf += dt * (strom() / (p.U0 / p.R)) * 90;
        if (t >= 5 * T()) {
          t = 5 * T();
          sample();
          env.finish();
        } else if (++n % 4 === 0) sample();
      },
      measure: () => ({ t, UC: uc(), I: strom(), Q: (p.C * uc()) / 1000 }),
      plot(key) {
        const xRange: [number, number] = [0, 5 * T()];
        if (key === 'I') return { x: buf.t, ys: [buf.i], xRange, yRange: [0, (p.U0 / p.R) * 1.08] };
        const marke = show.marke ? buf.t.map(() => p.U0 * (laden() ? 0.632 : 0.368)) : [];
        return { x: buf.t, ys: [buf.uc, buf.ur, marke], xRange, yRange: [0, p.U0 * 1.08] };
      },
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const l = Math.max(60, w * 0.16);
        const r = w - Math.max(125, w * 0.16);
        const top = Math.max(50, h * 0.2);
        const bot = h - Math.max(60, h * 0.22);
        const mx = l + (r - l) * 0.34; // Schalter
        const cx = r; // Kondensator im rechten Zweig
        const cyK = (top + bot) / 2;
        const an = env.isRunning() || t > 0;
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        const weg = (pts: number[]) => {
          ctx.beginPath();
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.stroke();
        };
        // Quelle links, Brücke in der Mitte (Entladeweg), Kondensator rechts
        weg([l, cyK - 22, l, top, mx - 22, top]);
        weg([l, cyK + 22, l, bot, r, bot, r, cyK + 9]);
        weg([mx + 22, top, r, top, r, cyK - 9]);
        weg([mx, top + 30, mx, bot]);
        // Quelle
        line(ctx, l - 16, cyK - 22, l + 16, cyK - 22, theme.text, 2.5);
        line(ctx, l - 9, cyK - 12, l + 9, cyK - 12, theme.text, 5);
        line(ctx, l, cyK - 12, l, cyK + 22, theme.text, 2);
        label(ctx, '+', l + 22, cyK - 20, { size: 14, bold: true, color: theme.plus });
        label(ctx, `U_0 = ${fmt(p.U0, 1)} V`, l + 22, cyK + 12, { size: 12, bold: true });
        // Umschalter: Laden = Kontakt nach links oben (Quelle), Entladen = nach unten (Brücke)
        const zurQuelle = laden() ? an : !an;
        disc(ctx, mx - 22, top, 4, theme.bg, theme.text, 2);
        disc(ctx, mx, top + 30, 4, theme.bg, theme.text, 2);
        disc(ctx, mx + 22, top, 4, theme.bg, theme.text, 2);
        if (zurQuelle) line(ctx, mx + 22, top, mx - 19, top - 3, theme.object, 3.5);
        else line(ctx, mx + 22, top, mx + 3, top + 27, theme.object, 3.5);
        label(ctx, 'S', mx + 22, top - 12, { align: 'center', size: 12, bold: true });
        // Schalter antippen: Vorgang starten
        hs.begin();
        if (!an) {
          const hsw = hs.add({ dist: point(mx, top + 8), radius: 30, cursor: 'pointer', drag() {}, tap: () => env.play() });
          label(ctx, 'Schalter umlegen: antippen', mx, top - 28, { align: 'center', size: 11.5, bold: hs.isHover(hsw), color: theme.object });
        }
        // Widerstand im oberen Zweig
        const rx = mx + (r - mx) * 0.5;
        box(ctx, rx - 34, top - 11, 68, 22, theme.bg, theme.text, 2, 2);
        label(ctx, `R = ${fmt(p.R, 0)} kΩ`, rx, top - 18, { align: 'center', size: 12, bold: true });
        // Kondensator
        box(ctx, cx - 26, cyK - 12, 52, 5, theme.text);
        box(ctx, cx - 26, cyK + 7, 52, 5, theme.text);
        label(ctx, `C = ${fmt(p.C, 0)} µF`, cx - 36, cyK + 5, { align: 'right', size: 12, bold: true });
        const anteil = uc() / 12;
        if (show.ladung && anteil > 0.02) {
          const k = Math.max(1, Math.round(anteil * 7));
          for (let i = 0; i < k; i++) {
            const x = cx - 22 + ((i + 0.5) * 44) / k;
            label(ctx, '+', x, cyK - 16, { align: 'center', size: 13, bold: true, color: theme.plus });
            label(ctx, '–', x, cyK + 27, { align: 'center', size: 13, bold: true, color: theme.minus });
          }
        }
        // Spannungsmesser am Kondensator
        box(ctx, cx + 34, cyK - 15, Math.min(78, w - cx - 38), 30, '#16261f', theme.text, 3);
        ctx.font = `600 13px ${theme.mono}`;
        ctx.fillStyle = '#b6f2c9';
        ctx.textAlign = 'left';
        ctx.fillText(`${fmt(uc(), 2)} V`, cx + 41, cyK + 5);
        // Elektronenbewegung: beim Laden gegen den Uhrzeigersinn (von der oberen Platte zum Pluspol), beim Entladen umgekehrt über die Brücke
        if (show.strom && an && strom() > (p.U0 / p.R) * 0.01) {
          const pfad = laden() ? [r, cyK - 14, r, top, l, top, l, cyK - 24] : [r, cyK + 14, r, bot, mx, bot, mx, top + 30, mx + 22, top, r, top, r, cyK - 14];
          let len = 0;
          const seg: number[] = [];
          for (let i = 0; i + 3 < pfad.length; i += 2) {
            const d = Math.hypot(pfad[i + 2] - pfad[i], pfad[i + 3] - pfad[i + 1]);
            seg.push(d);
            len += d;
          }
          for (let s0 = lauf % 34; s0 < len; s0 += 34) {
            let s = s0;
            let i = 0;
            while (i < seg.length - 1 && s > seg[i]) s -= seg[i++];
            const f = s / seg[i];
            disc(ctx, pfad[2 * i] + (pfad[2 * i + 2] - pfad[2 * i]) * f, pfad[2 * i + 1] + (pfad[2 * i + 3] - pfad[2 * i + 1]) * f, 3.2, theme.minus);
          }
          const mid = laden() ? [(l + mx) / 2 + 20, top - 16, (l + mx) / 2 - 20, top - 16] : [(mx + r) / 2 - 20, bot + 16, (mx + r) / 2 + 20, bot + 16];
          arrow(ctx, mid[0], mid[1], mid[2], mid[3], theme.minus, 2);
          label(ctx, 'Elektronen', (mid[0] + mid[2]) / 2, mid[1] + (laden() ? -8 : 18), { align: 'center', size: 11, color: theme.minus });
        }
        label(ctx, laden() ? (an ? 'Kondensator wird geladen' : 'Kondensator ungeladen, Schalter offen') : an ? 'Kondensator wird entladen' : 'Kondensator geladen', w / 2, h - 16, {
          align: 'center',
          size: 12.5,
          color: theme.muted
        });
      }
    };
  }
};
