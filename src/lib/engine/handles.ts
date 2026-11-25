/**
 * Anfasser für das direkte Ziehen in der Zeichnung.
 *
 * Eine Simulation meldet beim Zeichnen ihre Anfasser an (Lage, Trefferfläche,
 * was beim Ziehen passiert). `pointer()` erledigt dann Treffertest, Cursor und
 * Ziehen. Weil die Anfasser bei jedem Bild neu entstehen, passen sie immer zur
 * aktuellen Geometrie, auch wenn sich die Zeichenfläche in der Größe ändert.
 */
import type { PointerKind } from '../sim/types';
import { theme } from './theme';

export interface Handle {
  /** Abstand des Zeigers zum Anfasser in px; Treffer, wenn kleiner als `radius`. */
  dist(x: number, y: number): number;
  radius?: number;
  /** Cursor über dem Anfasser, z. B. 'ew-resize' */
  cursor?: string;
  /** Zeiger bewegt sich mit gedrücktem Anfasser. dx/dy: Versatz zum Greifpunkt beim Anfassen. */
  drag(x: number, y: number): void;
  /** Anfasser wurde losgelassen */
  end?(): void;
  /** Nur antippen (ohne Ziehen) */
  tap?(): void;
}

export const point =
  (px: number, py: number) =>
  (x: number, y: number): number =>
    Math.hypot(x - px, y - py);

export const rect =
  (x0: number, y0: number, w: number, h: number) =>
  (x: number, y: number): number => {
    const dx = Math.max(x0 - x, 0, x - (x0 + w));
    const dy = Math.max(y0 - y, 0, y - (y0 + h));
    return Math.hypot(dx, dy);
  };

export class Handles {
  private list: Handle[] = [];
  private active: Handle | null = null;
  private moved = false;
  private sx = 0;
  private sy = 0;
  /** Index des Anfassers unter dem Zeiger (für die Hervorhebung beim Zeichnen) */
  hover: Handle | null = null;

  /** Zu Beginn jedes Zeichnens aufrufen */
  begin(): void {
    this.list = [];
  }

  add(h: Handle): Handle {
    this.list.push(h);
    return h;
  }

  get dragging(): boolean {
    return this.active !== null;
  }

  private find(x: number, y: number): Handle | null {
    let best: Handle | null = null;
    let bd = Infinity;
    for (const h of this.list) {
      const d = h.dist(x, y);
      if (d <= (h.radius ?? 14) && d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  /** Für SimRuntime.pointer: liefert den Cursor oder nichts. */
  pointer(kind: PointerKind, x: number, y: number): string | void {
    if (kind === 'down') {
      const h = this.find(x, y);
      if (!h) return;
      this.active = h;
      this.moved = false;
      this.sx = x;
      this.sy = y;
      return h.cursor ?? 'grabbing';
    }
    if (kind === 'move') {
      if (!this.active) {
        this.hover = this.find(x, y);
        return this.hover ? (this.hover.cursor ?? 'grab') : '';
      }
      if (!this.moved && Math.hypot(x - this.sx, y - this.sy) < 3) return this.active.cursor ?? 'grabbing';
      this.moved = true;
      this.active.drag(x, y);
      return this.active.cursor ?? 'grabbing';
    }
    const h = this.active;
    this.active = null;
    if (!h) return;
    if (!this.moved && h.tap) h.tap();
    h.end?.();
  }

  isHover(h: Handle | undefined): boolean {
    return !!h && (this.hover === h || this.active === h);
  }
}

/**
 * Kleiner Hinweis, dass man etwas anfassen kann: ein Kreis in Zinnober
 * mit zwei Pfeilspitzen in Zugrichtung ('h', 'v' oder 'hv').
 */
export function grip(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'h' | 'v' | 'hv' = 'hv', active = false): void {
  ctx.save();
  ctx.fillStyle = active ? theme.object : '#fffdf7';
  ctx.strokeStyle = theme.object;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.object;
  const tri = (ax: number, ay: number, ux: number, uy: number) => {
    ctx.beginPath();
    ctx.moveTo(ax + ux * 6, ay + uy * 6);
    ctx.lineTo(ax - uy * 4, ay + ux * 4);
    ctx.lineTo(ax + uy * 4, ay - ux * 4);
    ctx.closePath();
    ctx.fill();
  };
  if (dir.includes('h')) {
    tri(x + 10, y, 1, 0);
    tri(x - 10, y, -1, 0);
  }
  if (dir.includes('v')) {
    tri(x, y + 10, 0, 1);
    tri(x, y - 10, 0, -1);
  }
  ctx.restore();
}
