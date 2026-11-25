/**
 * Dichtebestimmung: Masse mit der Waage, Volumen über die Wasserverdrängung
 * im Messzylinder. Die Körper A bis E bestehen aus unterschiedlichen Stoffen.
 */
import { box, fmt, label, line, paper } from '../lib/engine/draw';
import { Handles, rect } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

/** Dichten in g/cm³ */
export const STOFFE = [
  { name: 'A', rho: 2.7, fill: '#c9ced6', edge: '#7c8794' }, // Aluminium
  { name: 'B', rho: 0.72, fill: '#d9b98a', edge: '#96743f' }, // Buchenholz
  { name: 'C', rho: 7.87, fill: '#9aa3ad', edge: '#59626d' }, // Eisen
  { name: 'D', rho: 0.92, fill: '#e8e3d0', edge: '#a39c80' }, // Kerzenwachs
  { name: 'E', rho: 11.3, fill: '#8c93a3', edge: '#4f5565' } // Blei
];
const V_WASSER = 100;

export function fuellstand(rho: number, V: number): number {
  // Schwimmende Körper verdrängen nur so viel Wasser, wie ihrer Masse entspricht.
  return V_WASSER + (rho < 1 ? rho * V : V);
}

export const sim: SimDef = {
  id: 'dichte',
  title: 'Dichte bestimmen',
  summary: 'Masse wiegen, Volumen über die Wasserverdrängung messen und daraus den Stoff eines Körpers ermitteln.',
  hint: 'Den Körper kannst du mit Maus oder Finger greifen und auf die Waage oder in den Messzylinder legen.',
  animated: false,
  params: [
    {
      key: 'stoff',
      label: 'Körper',
      unit: '',
      min: 0,
      max: 4,
      step: 1,
      value: 0,
      choices: STOFFE.map((s, i) => ({ value: i, label: s.name }))
    },
    { key: 'V', label: 'Größe des Körpers (Volumen)', symbol: 'V', unit: 'cm³', min: 10, max: 60, step: 5, value: 30 },
    {
      key: 'ort',
      label: 'Der Körper liegt',
      unit: '',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'auf der Waage' },
        { value: 1, label: 'im Messzylinder' }
      ]
    }
  ],
  options: [{ key: 'hilfe', label: 'Ableselinie am Messzylinder', value: true }],
  plots: [],
  measures: [
    { key: 'masse', label: 'Masse (zuletzt gewogen)', symbol: 'm', unit: 'g', digits: 1 },
    { key: 'stand', label: 'Füllstand mit Körper (zuletzt abgelesen)', symbol: 'V_Stand', unit: 'ml', digits: 0 }
  ],

  create(env) {
    const { p, show } = env;
    const stoff = () => STOFFE[Math.round(p.stoff)] ?? STOFFE[0];
    const masse = () => stoff().rho * p.V;
    /** Körper wird gerade getragen (Position der Mitte in px) */
    let traeg: { x: number; y: number } | null = null;
    const stand = () => (p.ort === 1 && !traeg ? fuellstand(stoff().rho, p.V) : V_WASSER);
    const hs = new Handles();

    // Beide Messungen merken, damit sie gemeinsam ins Arbeitsblatt übernommen werden können.
    let gewogen: number | null = null;
    let abgelesen: number | null = null;
    const merke = () => {
      if (p.ort === 0) gewogen = masse();
      else abgelesen = Math.round(stand());
    };

    return {
      reset() {
        gewogen = abgelesen = null;
        merke();
      },
      update(key) {
        if (key !== 'ort') gewogen = abgelesen = null;
        merke();
      },
      measure: () => ({ masse: gewogen, stand: abgelesen }),
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const table = h - 46;
        line(ctx, 0, table, w, table, theme.text, 2);
        ctx.fillStyle = '#e9e3d3';
        ctx.fillRect(0, table + 1, w, h - table);

        const s = stoff();
        const side = 13 * Math.cbrt(p.V); // Würfelkante in Pixeln

        // ----- Waage -----
        const wx = w * 0.28;
        const ww = Math.min(210, w * 0.36);
        box(ctx, wx - ww / 2, table - 44, ww, 44, '#e3e6ea', theme.text, 6, 2);
        box(ctx, wx - ww / 2 - 8, table - 54, ww + 16, 10, theme.metal, theme.text, 3, 2);
        box(ctx, wx - 62, table - 34, 124, 26, '#16261f', theme.text, 3);
        ctx.font = `600 17px ${theme.mono}`;
        ctx.fillStyle = '#b6f2c9';
        ctx.textAlign = 'right';
        ctx.fillText(`${fmt(p.ort === 0 && !traeg ? masse() : 0, 1)} g`, wx + 54, table - 15);
        label(ctx, 'Waage', wx, table + 24, { align: 'center', size: 13, color: theme.muted });

        // ----- Messzylinder -----
        const zx = w * 0.7;
        const zw = Math.min(110, w * 0.2);
        const zh = Math.min(table - 60, 330);
        const zTop = table - zh - 6;
        const mlPx = (zh - 12) / 200; // 0 … 200 ml
        const yOf = (ml: number) => table - 6 - ml * mlPx;
        ctx.fillStyle = theme.water;
        ctx.fillRect(zx - zw / 2, yOf(stand()), zw, stand() * mlPx);
        line(ctx, zx - zw / 2, yOf(stand()), zx + zw / 2, yOf(stand()), theme.waterDark, 2);
        for (let ml = 10; ml <= 200; ml += 10) {
          const big = ml % 50 === 0;
          line(ctx, zx + zw / 2 - (big ? 22 : 12), yOf(ml), zx + zw / 2, yOf(ml), theme.axis, big ? 1.6 : 1);
          if (big) label(ctx, `${ml}`, zx + zw / 2 + 8, yOf(ml) + 4, { size: 12, color: theme.muted });
        }
        for (let ml = 2; ml < 200; ml += 2)
          if (ml % 10) line(ctx, zx + zw / 2 - 6, yOf(ml), zx + zw / 2, yOf(ml), theme.metalDark, 0.6);
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(zx - zw / 2, zTop);
        ctx.lineTo(zx - zw / 2, table - 6);
        ctx.lineTo(zx + zw / 2, table - 6);
        ctx.lineTo(zx + zw / 2, zTop);
        ctx.stroke();
        box(ctx, zx - zw / 2 - 14, table - 6, zw + 28, 6, theme.metal, theme.text, 2, 2);
        label(ctx, 'ml', zx + zw / 2 + 8, zTop + 6, { size: 12, color: theme.muted });
        label(ctx, 'Messzylinder', zx, table + 24, { align: 'center', size: 13, color: theme.muted });
        if (show.hilfe && !traeg) {
          line(ctx, zx - zw / 2 - 46, yOf(stand()), zx - zw / 2 - 4, yOf(stand()), theme.force, 1.5, [4, 3]);
          label(ctx, `${Math.round(stand())} ml`, zx - zw / 2 - 50, yOf(stand()) + 4, { align: 'right', size: 13, color: theme.force, bold: true });
        }

        // ----- Körper -----
        let bx: number;
        let by: number;
        if (p.ort === 0) {
          bx = wx - side / 2;
          by = table - 54 - side;
        } else {
          bx = zx - Math.min(side, zw - 10) / 2;
          // schwimmt (teilweise eingetaucht) oder liegt am Boden
          by = s.rho < 1 ? yOf(stand()) - side * (1 - s.rho) : table - 8 - side;
        }
        let bw = p.ort === 1 ? Math.min(side, zw - 10) : side;
        if (traeg) {
          bw = side;
          bx = traeg.x - side / 2;
          by = traeg.y - side / 2;
        }
        hs.begin();
        if (env.canSet('ort')) {
          const mitte = (wx + zx) / 2;
          const hb = hs.add({
            dist: rect(bx, by, bw, side),
            radius: 6,
            cursor: 'grab',
            drag: (x, y) => {
              traeg = { x, y: Math.min(y, table - side / 2) };
              env.invalidate();
            },
            end: () => {
              const ziel = traeg ? (traeg.x < mitte ? 0 : 1) : p.ort;
              traeg = null;
              if (env.set('ort', ziel) === p.ort) merke();
              env.invalidate();
            }
          });
          if (hs.isHover(hb) && !traeg) label(ctx, 'ziehen', bx + bw / 2, by - 8, { align: 'center', size: 12, bold: true, color: theme.object });
        }
        if (traeg) {
          ctx.save();
          ctx.shadowColor = 'rgba(27,36,51,0.25)';
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 6;
          box(ctx, bx, by, bw, side, s.fill, s.edge, 3, 2);
          ctx.restore();
        } else box(ctx, bx, by, bw, side, s.fill, s.edge, 3, 2);
        label(ctx, s.name, bx + bw / 2, by + side / 2 + 5, { align: 'center', bold: true, size: 15 });
        if (p.ort === 1 && !traeg) {
          ctx.fillStyle = 'rgba(168, 211, 234, 0.45)';
          const sub = Math.max(by, yOf(stand()));
          ctx.fillRect(bx - 1, sub, bw + 2, by + side - sub + 1);
        }
      }
    };
  }
};
