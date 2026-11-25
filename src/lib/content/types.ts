import type { SimConfig } from '../sim/types';
import type { LessonVideo } from '../video/types';
import type { Worksheet } from '../worksheet/types';

export const GRADES = [7, 8, 9, 10, 11, 12, 13] as const;

export const DOMAINS = {
  materie: 'Materie',
  optik: 'Optik',
  elektrik: 'Elektrizität',
  mechanik: 'Mechanik',
  waerme: 'Wärme und Energie',
  wellen: 'Schwingungen und Wellen',
  felder: 'Felder',
  quanten: 'Quantenphysik',
  kern: 'Atom- und Kernphysik'
} as const;
export type Domain = keyof typeof DOMAINS;

/**
 * Eine Lerneinheit: alles, was sich ohne Programmieren ändern lässt.
 * Gespeichert als content/einheiten/<id>.json.
 */
export interface Lesson {
  /** Dateiname ohne Endung, nur Kleinbuchstaben, Ziffern und Bindestriche */
  id: string;
  title: string;
  grade: number;
  /** Reihenfolge innerhalb der Jahrgangsstufe */
  order: number;
  domain: Domain;
  /** Lehrplanbezug, z. B. "Ph8 Lernbereich 2: Optik" */
  curriculum: string;
  /** Ein bis zwei Sätze für die Übersicht */
  summary: string;
  video: LessonVideo;
  sim: SimConfig;
  worksheet: Worksheet;
}
