import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveSim } from '../sim/resolve';
import { simById, sims } from '../../sims';
import { splitOperator, operatorByKey } from '../worksheet/operators';
import { isTask } from '../worksheet/types';
import { GRADES, type Lesson } from './types';
import { checkLesson, normalizeLesson } from './validate';

const dir = join(process.cwd(), 'content/einheiten');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const lessons = files.map((f) => [f, normalizeLesson(JSON.parse(readFileSync(join(dir, f), 'utf8')))] as [string, Lesson]);

describe('Lerneinheiten in content/einheiten', () => {
  it.each(lessons)('%s ist gültig', (file, l) => {
    expect(`${l.id}.json`).toBe(file);
    expect(checkLesson(l, simById(l.sim.id))).toEqual([]);
  });

  it.each(lessons)('%s: jeder Operator steht auch im Aufgabentext', (_file, l) => {
    for (const b of l.worksheet.blocks) {
      if (!isTask(b) || !b.operator) continue;
      const [, word] = splitOperator(b.prompt, operatorByKey(b.operator)!);
      expect(word, `${b.id}: „${b.prompt}“`).not.toBe('');
    }
  });

  it('hat eindeutige Kennungen', () => {
    expect(new Set(lessons.map(([, l]) => l.id)).size).toBe(lessons.length);
  });

  it('deckt nur vorhandene Jahrgangsstufen ab', () => {
    for (const [, l] of lessons) expect(GRADES).toContain(l.grade);
  });
});

describe('resolveSim', () => {
  const def = simById('wurf')!;

  it('übernimmt ohne Anpassung die Vorgaben der Simulation', () => {
    const r = resolveSim(def);
    expect(r.params.map((p) => p.value)).toEqual(def.params.map((p) => p.value));
    expect(r.plots.length).toBe(def.plots.length);
  });

  it('hält Bereich und Startwert innerhalb der Grenzen der Simulation', () => {
    const r = resolveSim(def, { id: 'wurf', params: { v0: { min: -50, max: 999, value: 500 }, h0: { min: 10, max: 2, value: 0 } } });
    const v0 = r.params.find((p) => p.key === 'v0')!;
    expect([v0.min, v0.max, v0.value]).toEqual([1, 30, 30]);
    const h0 = r.params.find((p) => p.key === 'h0')!;
    expect([h0.min, h0.max, h0.value]).toEqual([2, 10, 2]);
  });

  it('blendet Regler, Anzeigen und Diagramme aus', () => {
    const r = resolveSim(def, { id: 'wurf', params: { alpha: { hidden: true, value: 0 } }, options: { spuren: { hidden: true, value: false } }, hiddenPlots: ['vx'] });
    expect(r.params.find((p) => p.key === 'alpha')).toMatchObject({ hidden: true, value: 0 });
    expect(r.options.find((o) => o.key === 'spuren')).toMatchObject({ hidden: true, value: false });
    expect(r.plots.some((p) => p.key === 'vx')).toBe(false);
  });

  it('verwirft unbekannte Regler in Voreinstellungen', () => {
    const r = resolveSim(def, { id: 'wurf', presets: [{ name: 'Test', values: { g: 5, gibtsnicht: 1 } }] });
    expect(r.presets).toEqual([{ name: 'Test', values: { g: 5 } }]);
  });
});

describe('Simulationen', () => {
  it('haben eindeutige Kennungen und eindeutige Schlüssel', () => {
    expect(new Set(sims.map((s) => s.id)).size).toBe(sims.length);
    for (const s of sims) {
      const keys = [...s.params.map((p) => p.key), ...s.measures.map((m) => m.key)];
      // Messgröße und Regler dürfen nicht denselben Schlüssel tragen, sonst ist die Tabellenquelle mehrdeutig.
      expect(new Set(keys).size, s.id).toBe(keys.length);
    }
  });
});
