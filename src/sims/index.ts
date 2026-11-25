/**
 * Verzeichnis aller Simulationen. Eine neue Simulation wird hier eingetragen
 * und steht danach in Übersicht, Lerneinheiten und Editor zur Verfügung.
 */
import type { SimDef } from '../lib/sim/types';
import { sim as dichte } from './dichte';
import { sim as energiebahn } from './energiebahn';
import { sim as federpendel } from './federpendel/sim';
import { sim as hooke } from './hooke';
import { sim as kennlinie } from './kennlinie';
import { sim as sammellinse } from './sammellinse';
import { sim as schaltung } from './schaltung';
import { sim as schatten } from './schatten';
import { sim as wurf } from './schiefer-wurf/sim';
import { sim as teilchen } from './teilchen';
import { sim as wasserkocher } from './wasserkocher';

export const sims: SimDef[] = [
  dichte,
  schatten,
  schaltung,
  kennlinie,
  sammellinse,
  hooke,
  energiebahn,
  wasserkocher,
  teilchen,
  wurf,
  federpendel
];

export const simById = (id: string): SimDef | undefined => sims.find((s) => s.id === id);
