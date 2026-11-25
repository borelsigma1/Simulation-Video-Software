/**
 * Lerneinheiten laden.
 *
 * Veröffentlichte Einheiten liegen als JSON im Repository und werden beim
 * Bauen der Seite eingebunden. Entwürfe aus dem Lehrkraft-Modus liegen im
 * Speicher dieses Browsers (localStorage) und überdecken die veröffentlichte
 * Fassung, aber nur im Lehrkraft-Modus und in dessen Vorschau.
 */
import type { Lesson } from './types';

const files = import.meta.glob<Lesson>('../../../content/einheiten/*.json', { eager: true, import: 'default' });

export const published: Lesson[] = Object.values(files).sort((a, b) => a.grade - b.grade || a.order - b.order);

const KEY = 'physik-workspace:entwurf:';

function readDrafts(): Record<string, Lesson> {
  const out: Record<string, Lesson> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY)) out[k.slice(KEY.length)] = JSON.parse(localStorage.getItem(k)!);
    }
  } catch {
    // localStorage gesperrt (z. B. privater Modus): dann gibt es eben keine Entwürfe
  }
  return out;
}

class Drafts {
  all = $state<Record<string, Lesson>>(readDrafts());

  save(lesson: Lesson): void {
    this.all[lesson.id] = lesson;
    try {
      localStorage.setItem(KEY + lesson.id, JSON.stringify(lesson));
    } catch {
      /* siehe oben */
    }
  }

  remove(id: string): void {
    delete this.all[id];
    try {
      localStorage.removeItem(KEY + id);
    } catch {
      /* siehe oben */
    }
  }
}

export const drafts = new Drafts();

export const publishedById = (id: string): Lesson | undefined => published.find((l) => l.id === id);

/** Entwurf, falls vorhanden, sonst die veröffentlichte Fassung. */
export const lessonForEditing = (id: string): Lesson | undefined => drafts.all[id] ?? publishedById(id);

/** Alle Einheiten für den Lehrkraft-Modus (Entwürfe überdecken Veröffentlichtes). */
export function allForTeacher(): Lesson[] {
  const map = new Map<string, Lesson>(published.map((l) => [l.id, l]));
  for (const d of Object.values(drafts.all)) map.set(d.id, d);
  return [...map.values()].sort((a, b) => a.grade - b.grade || a.order - b.order || a.title.localeCompare(b.title));
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'einheit'
  );
}

/** Freie Kennung, die es weder veröffentlicht noch als Entwurf gibt. */
export function freeId(base: string): string {
  const taken = new Set([...published.map((l) => l.id), ...Object.keys(drafts.all)]);
  const root = slugify(base);
  if (!taken.has(root)) return root;
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
}
