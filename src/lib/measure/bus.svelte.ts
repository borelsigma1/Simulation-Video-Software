/**
 * Messwert-Schnittstelle zwischen Simulation und Arbeitsblatt.
 *
 * Eine Simulation veröffentlicht hier ihre aktuellen Messwerte (z. B. Masse,
 * gemessene Periodendauer). Das Arbeitsblatt liest sie, wenn Schülerinnen und
 * Schüler auf „Messwerte übernehmen“ tippen. So bleiben Simulation und
 * Arbeitsblatt unabhängig voneinander und lassen sich frei kombinieren.
 *
 * Es gibt pro Seite eine Instanz (eine Simulation pro Lerneinheit).
 */
export interface Measurement {
  key: string;
  label: string;
  /** Formelzeichen, z. B. "T" */
  symbol?: string;
  unit: string;
  /** null = (noch) nicht gemessen */
  value: number | null;
  /** Nachkommastellen für die Anzeige */
  digits: number;
}

class MeasurementBus {
  values = $state<Record<string, Measurement>>({});
  /** Liefert ein PNG (Data-URL) des aktuellen Simulationsbildes. */
  snapshot: (() => string) | null = null;
  /** Name der Simulation, die gerade Werte liefert. */
  source = $state('');

  define(list: Omit<Measurement, 'value'>[], source: string): void {
    const next: Record<string, Measurement> = {};
    for (const m of list) next[m.key] = { ...m, value: null };
    this.values = next;
    this.source = source;
  }

  set(key: string, value: number | null): void {
    const m = this.values[key];
    if (m && m.value !== value) m.value = value;
  }

  get(key: string): Measurement | undefined {
    return this.values[key];
  }

  clear(): void {
    this.values = {};
    this.snapshot = null;
    this.source = '';
  }
}

export const measurements = new MeasurementBus();

/** Wert im deutschen Zahlenformat für Tabellen/Anzeigen. */
export function formatMeasurement(m: Measurement | undefined): string {
  if (!m || m.value === null || !Number.isFinite(m.value)) return '';
  return m.value.toLocaleString('de-DE', {
    minimumFractionDigits: m.digits,
    maximumFractionDigits: m.digits,
    useGrouping: false
  });
}
