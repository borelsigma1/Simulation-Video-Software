/**
 * Schrödinger-Labore als „Simulationen“ des Workspace. Sie bringen ihre eigene
 * Oberfläche mit (SimDef.mount); `create` zeichnet nur das Vorschaubild für
 * Übersicht und Editor. Die Labore selbst werden erst beim Öffnen geladen.
 */
import { label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef, Stage } from '../lib/sim/types';

function thumb1d({ ctx, w, h }: Stage) {
  paper(ctx, w, h);
  const base = h * 0.82;
  const xl = w * 0.3;
  const xr = w * 0.7;
  ctx.fillStyle = '#ece6d6';
  ctx.fillRect(xl - 22, h * 0.12, 22, base - h * 0.12);
  ctx.fillRect(xr, h * 0.12, 22, base - h * 0.12);
  line(ctx, xl, h * 0.12, xl, base, theme.text, 2.5);
  line(ctx, xl, base, xr, base, theme.text, 2.5);
  line(ctx, xr, base, xr, h * 0.12, theme.text, 2.5);
  const levels = [1, 2, 3];
  for (const n of levels) {
    const y = base - (base - h * 0.16) * ((n * n) / 10.5);
    line(ctx, xl, y, xr, y, '#0e5a4b', 1.6, [5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      const yy = y - Math.sin(n * Math.PI * u) * h * 0.07;
      if (i) ctx.lineTo(xl + u * (xr - xl), yy);
      else ctx.moveTo(xl, yy);
    }
    ctx.strokeStyle = n === 2 ? theme.object : theme.velocity;
    ctx.lineWidth = n === 2 ? 3 : 2;
    ctx.stroke();
  }
  label(ctx, 'ψ', xr + 34, base - (base - h * 0.16) * (4 / 10.5) + 5, { size: 20, color: theme.object, bold: true });
}

function thumbCoulomb({ ctx, w, h }: Stage) {
  paper(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.36;
  // 2p-artige Keulen als Wolke aus Punkten (fester Zufall, damit das Bild ruhig bleibt)
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const r = R * Math.sqrt(rnd());
    const a = rnd() * Math.PI * 2;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    const v = (x / R) ** 2 * Math.exp(-((r / R) * 3)) * 9;
    if (rnd() < v) {
      ctx.fillStyle = x > 0 ? 'rgba(29,95,191,0.55)' : 'rgba(185,133,9,0.6)';
      ctx.fillRect(cx + x * 1.25, cy + y * 0.75, 2, 2);
    }
  }
  ctx.strokeStyle = theme.gridStrong;
  ctx.lineWidth = 1;
  for (const k of [0.45, 0.8]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * 1.25 * k, R * 0.75 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = theme.force;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, '2p', 16, 30, { size: 20, bold: true, color: '#0e5a4b' });
}

const noRuntime = (paint: (g: Stage) => void) => () => ({
  reset() {},
  measure: () => ({}),
  draw: paint
});

export const schroedinger1d: SimDef = {
  id: 'schroedinger-1d',
  title: 'Schrödinger-Labor 1D',
  summary:
    'Energie verstellen, bis die Lösung der Schrödingergleichung normierbar wird: Energieniveaus in Töpfen, Oszillator, Coulombpotenzial, Doppel- und Mehrfachtopf, Tunneleffekt an der Barriere.',
  animated: false,
  params: [
    {
      key: 'potential',
      label: 'Potenzial beim Start',
      unit: '',
      min: 0,
      max: 6,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'Unendlicher Topf' },
        { value: 1, label: 'Endlicher Topf' },
        { value: 2, label: 'Harmonischer Oszillator' },
        { value: 3, label: 'Coulomb' },
        { value: 4, label: 'Doppeltopf' },
        { value: 5, label: 'Mehrfachtopf' },
        { value: 6, label: 'Barriere' }
      ]
    }
  ],
  options: [],
  plots: [],
  measures: [],
  create: noRuntime(thumb1d),
  mount: async (target, { p }) => (await import('../labs/schroedinger')).mountLab(target, '1d', p)
};

export const schroedingerCoulomb: SimDef = {
  id: 'schroedinger-coulomb',
  title: 'Schrödinger-Labor: Wasserstoffatom',
  summary:
    'Stehende Wellen im Coulombpotenzial: radiale Welle, Welle in der Ebene und Orbitale in 3D, Quantenzahlen n, l und m, Termschema mit Orbitalvergleich.',
  animated: false,
  params: [
    {
      key: 'reiter',
      label: 'Reiter beim Start',
      unit: '',
      min: 1,
      max: 3,
      step: 1,
      value: 3,
      choices: [
        { value: 1, label: '1D radial' },
        { value: 2, label: '2D Ebene' },
        { value: 3, label: '3D Atom' }
      ]
    }
  ],
  options: [],
  plots: [],
  measures: [],
  create: noRuntime(thumbCoulomb),
  mount: async (target, { p }) => (await import('../labs/schroedinger')).mountLab(target, 'coulomb', p)
};
