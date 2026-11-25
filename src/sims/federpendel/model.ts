/**
 * Vertikales Federpendel mit optionaler geschwindigkeitsproportionaler Dämpfung.
 *
 * s: Auslenkung aus der Ruhelage in m (positiv = nach unten).
 * In der Ruhelage heben sich Gewichtskraft und Federkraft auf, daher gilt
 * für die rücktreibende Kraft F = −D·s − b·v.
 */
export interface PendelParams {
  /** Masse in kg */
  m: number;
  /** Federkonstante in N/m */
  D: number;
  /** Dämpfungskonstante in kg/s */
  b: number;
}

export interface PendelState {
  t: number;
  s: number;
  v: number;
}

export function acceleration(p: PendelParams, s: number, v: number): number {
  return (-p.D * s - p.b * v) / p.m;
}

/** Ein Runge-Kutta-Schritt 4. Ordnung (sehr genau, auch über viele Perioden). */
export function rk4Step(p: PendelParams, st: PendelState, dt: number): void {
  const { s, v } = st;
  const k1s = v;
  const k1v = acceleration(p, s, v);
  const k2s = v + 0.5 * dt * k1v;
  const k2v = acceleration(p, s + 0.5 * dt * k1s, v + 0.5 * dt * k1v);
  const k3s = v + 0.5 * dt * k2v;
  const k3v = acceleration(p, s + 0.5 * dt * k2s, v + 0.5 * dt * k2v);
  const k4s = v + dt * k3v;
  const k4v = acceleration(p, s + dt * k3s, v + dt * k3v);
  st.s = s + (dt / 6) * (k1s + 2 * k2s + 2 * k3s + k4s);
  st.v = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  st.t += dt;
}

/** Theoretische Periodendauer der ungedämpften Schwingung T = 2π·√(m/D). */
export function periodeTheorie(p: PendelParams): number {
  return 2 * Math.PI * Math.sqrt(p.m / p.D);
}

export function energien(p: PendelParams, st: PendelState): { kin: number; pot: number; ges: number } {
  const kin = 0.5 * p.m * st.v * st.v;
  // Spannenergie + Lageenergie zusammen, bezogen auf die Ruhelage
  const pot = 0.5 * p.D * st.s * st.s;
  return { kin, pot, ges: kin + pot };
}

/**
 * Misst die Periodendauer wie mit einer Stoppuhr: Zeitpunkte, an denen der
 * Körper die Ruhelage nach unten durchläuft, werden linear interpoliert.
 */
export class PeriodenMesser {
  private lastS: number | null = null;
  private lastT = 0;
  private crossings: number[] = [];
  /** Größte Auslenkung seit dem letzten Durchgang */
  private peak = 0;
  amplitude: number | null = null;

  reset(): void {
    this.lastS = null;
    this.crossings = [];
    this.peak = 0;
    this.amplitude = null;
  }

  update(t: number, s: number): void {
    this.peak = Math.max(this.peak, Math.abs(s));
    if (this.lastS !== null && this.lastS < 0 && s >= 0) {
      const frac = this.lastS / (this.lastS - s);
      this.crossings.push(this.lastT + frac * (t - this.lastT));
      if (this.crossings.length > 6) this.crossings.shift();
      this.amplitude = this.peak;
      this.peak = 0;
    }
    this.lastS = s;
    this.lastT = t;
  }

  /** Mittelwert über die letzten (bis zu 5) vollständigen Perioden. */
  get periode(): number | null {
    const c = this.crossings;
    if (c.length < 2) return null;
    return (c[c.length - 1] - c[0]) / (c.length - 1);
  }
}
