/**
 * Prüft und bereinigt eine Lerneinheit (z. B. nach dem Import einer Datei).
 * Liefert eine Liste verständlicher Hinweise; leer = alles in Ordnung.
 */
import type { SimDef } from '../sim/types';
import { operatorByKey } from '../worksheet/operators';
import { isTask } from '../worksheet/types';
import { DOMAINS, GRADES, type Lesson } from './types';

export function checkLesson(l: Lesson, sim: SimDef | undefined): string[] {
  const out: string[] = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.id ?? '')) out.push(`Kennung „${l.id}“: nur Kleinbuchstaben, Ziffern und Bindestriche.`);
  if (!l.title?.trim()) out.push('Der Titel fehlt.');
  if (!(GRADES as readonly number[]).includes(l.grade)) out.push(`Jahrgangsstufe ${l.grade} gibt es nicht (7 bis 13).`);
  if (!(l.domain in DOMAINS)) out.push(`Unbekanntes Themengebiet „${l.domain}“.`);
  if (!sim) {
    out.push(`Die Simulation „${l.sim?.id}“ gibt es nicht.`);
    return out;
  }
  const params = new Set(sim.params.map((p) => p.key));
  const options = new Set(sim.options.map((o) => o.key));
  const plots = new Set(sim.plots.map((p) => p.key));
  const sources = new Set([...params, ...sim.measures.map((m) => m.key)]);
  for (const k of Object.keys(l.sim.params ?? {})) if (!params.has(k)) out.push(`Simulation: Regler „${k}“ gibt es nicht.`);
  for (const k of Object.keys(l.sim.options ?? {})) if (!options.has(k)) out.push(`Simulation: Anzeige „${k}“ gibt es nicht.`);
  for (const k of l.sim.hiddenPlots ?? []) if (!plots.has(k)) out.push(`Simulation: Diagramm „${k}“ gibt es nicht.`);
  for (const pr of l.sim.presets ?? [])
    for (const k of Object.keys(pr.values)) if (!params.has(k)) out.push(`Voreinstellung „${pr.name}“: Regler „${k}“ gibt es nicht.`);

  const ids = new Set<string>();
  const blocks = l.worksheet?.blocks ?? [];
  blocks.forEach((b, i) => {
    const where = `Baustein ${i + 1}`;
    if (!isTask(b)) return;
    if (!b.id) out.push(`${where}: Kennung fehlt.`);
    if (ids.has(b.id)) out.push(`${where}: Kennung „${b.id}“ kommt doppelt vor.`);
    ids.add(b.id);
    if (b.operator && !operatorByKey(b.operator)) out.push(`${where}: Operator „${b.operator}“ ist unbekannt.`);
    if (b.type === 'table') {
      if (!b.columns.length) out.push(`${where}: Die Tabelle hat keine Spalten.`);
      for (const c of b.columns)
        if (c.source && !sources.has(c.source)) out.push(`${where}: Spalte „${c.label}“ verweist auf den unbekannten Messwert „${c.source}“.`);
    }
    if (b.type === 'choice' && b.options.length < 2) out.push(`${where}: Eine Auswahlaufgabe braucht mindestens zwei Optionen.`);
    if (b.type === 'chart') {
      const t = blocks.find((x) => x.type === 'table' && x.id === b.table);
      if (!t || t.type !== 'table') out.push(`${where}: Die Wertetabelle zum Diagramm fehlt.`);
      else for (const k of [b.x, b.y]) if (!t.columns.some((c) => c.key === k)) out.push(`${where}: Spalte „${k}“ gibt es in der Tabelle nicht.`);
    }
  });
  return out;
}

/** Fehlende Felder mit Standardwerten füllen, damit Editor und Anzeige nie ins Leere greifen. */
export function normalizeLesson(raw: unknown): Lesson {
  const l = (raw && typeof raw === 'object' ? raw : {}) as Partial<Lesson>;
  return {
    id: String(l.id ?? ''),
    title: String(l.title ?? ''),
    grade: Number(l.grade ?? 7),
    order: Number(l.order ?? 1),
    domain: (l.domain ?? 'mechanik') as Lesson['domain'],
    curriculum: String(l.curriculum ?? ''),
    summary: String(l.summary ?? ''),
    video: l.video ?? { title: '', source: { kind: 'none' } },
    sim: { ...(l.sim ?? { id: '' }) },
    worksheet: {
      title: String(l.worksheet?.title ?? l.title ?? ''),
      subtitle: l.worksheet?.subtitle,
      blocks: Array.isArray(l.worksheet?.blocks) ? l.worksheet.blocks : []
    }
  };
}
