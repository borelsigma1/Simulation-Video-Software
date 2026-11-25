import type { ResolvedSim, SimConfig, SimDef } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Verbindet die Beschreibung einer Simulation mit den Anpassungen einer
 * Lerneinheit. Ungültige Angaben (unbekannte Schlüssel, vertauschte Grenzen,
 * Startwert außerhalb des Bereichs) werden stillschweigend korrigiert, damit
 * eine im Editor halb fertige Einheit nie die Simulation zerlegt.
 */
export function resolveSim(def: SimDef, config?: SimConfig): ResolvedSim {
  const params = def.params.map((d) => {
    const o = config?.params?.[d.key] ?? {};
    let min = Number.isFinite(o.min) ? (o.min as number) : d.min;
    let max = Number.isFinite(o.max) ? (o.max as number) : d.max;
    // Der Editor darf den Bereich nur innerhalb der physikalisch sinnvollen Grenzen ändern.
    min = clamp(min, d.min, d.max);
    max = clamp(max, d.min, d.max);
    if (min > max) [min, max] = [max, min];
    const step = Number.isFinite(o.step) && (o.step as number) > 0 ? (o.step as number) : d.step;
    let value = Number.isFinite(o.value) ? (o.value as number) : d.value;
    if (d.choices) {
      if (!d.choices.some((c) => c.value === value)) value = d.value;
    } else {
      value = clamp(value, min, max);
    }
    return {
      ...d,
      min,
      max,
      step,
      value,
      label: o.label?.trim() ? o.label : d.label,
      hidden: !!o.hidden,
      locked: !!o.locked
    };
  });

  const options = def.options.map((d) => {
    const o = config?.options?.[d.key] ?? {};
    return { ...d, value: o.value ?? d.value, hidden: !!o.hidden };
  });

  const hidden = new Set(config?.hiddenPlots ?? []);
  const plots = def.plots.filter((p) => !hidden.has(p.key));

  const known = new Set(def.params.map((p) => p.key));
  const presets = (config?.presets ?? def.presets ?? [])
    .map((p) => ({
      name: p.name,
      values: Object.fromEntries(Object.entries(p.values).filter(([k, v]) => known.has(k) && Number.isFinite(v)))
    }))
    .filter((p) => p.name.trim() !== '');

  return { params, options, plots, presets };
}

/** Anzahl sinnvoller Nachkommastellen zu einer Schrittweite (0,05 -> 2). */
export function digitsFor(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 2;
  const s = step.toString();
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  return s.includes('.') ? s.split('.')[1].length : 0;
}
