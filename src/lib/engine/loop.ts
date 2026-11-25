/**
 * Simulationsschleife mit festem Zeitschritt.
 *
 * Die Physik wird immer mit demselben kleinen Zeitschritt `fixedDt` gerechnet
 * (Standard: 1/240 s), unabhängig von der Bildwiederholrate des Geräts.
 * Gezeichnet wird einmal pro Bildschirmframe (requestAnimationFrame).
 * Dadurch sind die Ergebnisse reproduzierbar und die Darstellung bleibt
 * auf 60-Hz- wie auf 120-Hz-Displays flüssig.
 */
export interface LoopCallbacks {
  /** Ein Physikschritt der Länge dt (in Sekunden Simulationszeit). */
  step(dt: number): void;
  /** Zeichnen. Wird pro Frame aufgerufen, solange etwas zu zeichnen ist. */
  render(): void;
  /** Optional: einmal pro Frame nach den Physikschritten (z. B. Diagramm füttern). */
  afterFrame?(): void;
}

export class SimLoop {
  readonly fixedDt: number;
  /** Zeitlupe/Zeitraffer: 1 = Echtzeit, 0.25 = vierfache Zeitlupe. */
  timeScale = 1;

  private running = false;
  private dirty = true;
  private accumulator = 0;
  private lastTs: number | null = null;
  private rafId = 0;
  private readonly cb: LoopCallbacks;
  private listeners = new Set<(running: boolean) => void>();

  constructor(cb: LoopCallbacks, fixedDt = 1 / 240) {
    this.cb = cb;
    this.fixedDt = fixedDt;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Startet die Zeichenschleife (nicht die Simulation). */
  attach(): void {
    if (this.rafId) return;
    const frame = (ts: number) => {
      this.rafId = requestAnimationFrame(frame);
      this.tick(ts);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  detach(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  play(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = null;
    this.emit();
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.accumulator = 0;
    this.dirty = true;
    this.emit();
  }

  toggle(): void {
    if (this.running) this.pause();
    else this.play();
  }

  /** Einen einzelnen Bildschritt (1/60 s Simulationszeit) weiterrechnen. */
  stepOnce(seconds = 1 / 60): void {
    const n = Math.max(1, Math.round(seconds / this.fixedDt));
    for (let i = 0; i < n; i++) this.cb.step(this.fixedDt);
    this.cb.afterFrame?.();
    this.dirty = true;
  }

  /** Neu zeichnen lassen, z. B. nach einer Parameteränderung im Pausenzustand. */
  invalidate(): void {
    this.dirty = true;
  }

  onRunningChange(fn: (running: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.running);
  }

  private tick(ts: number): void {
    if (this.running) {
      if (this.lastTs === null) this.lastTs = ts;
      // Große Lücken (Tab im Hintergrund, Haltepunkt) nicht nachholen.
      const real = Math.min((ts - this.lastTs) / 1000, 0.1);
      this.lastTs = ts;
      this.accumulator += real * this.timeScale;
      let steps = 0;
      while (this.accumulator >= this.fixedDt && steps < 2000) {
        this.cb.step(this.fixedDt);
        this.accumulator -= this.fixedDt;
        steps++;
        if (!this.running) break; // Simulation hat sich selbst angehalten
      }
      this.cb.afterFrame?.();
      this.cb.render();
      this.dirty = false;
    } else if (this.dirty) {
      this.cb.render();
      this.dirty = false;
    }
  }
}
