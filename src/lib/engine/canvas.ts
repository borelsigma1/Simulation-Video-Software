/**
 * Canvas-Hilfen: scharfe Darstellung auf HiDPI-Displays (Tablets!) und
 * automatische Größenanpassung an den umgebenden Container.
 */
export interface CanvasView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Breite/Höhe in CSS-Pixeln. */
  width: number;
  height: number;
  destroy(): void;
}

export function createCanvasView(
  canvas: HTMLCanvasElement,
  onResize: (view: CanvasView) => void
): CanvasView {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D wird von diesem Browser nicht unterstützt.');

  const view: CanvasView = {
    canvas,
    ctx,
    width: 0,
    height: 0,
    destroy: () => ro.disconnect()
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.width = Math.max(1, rect.width);
    view.height = Math.max(1, rect.height);
    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(view.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(view);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return view;
}

/**
 * Abbildung Welt (Meter, y nach oben) -> Bildschirm (Pixel, y nach unten).
 */
export class Viewport {
  /** Pixel pro Meter */
  scale = 50;
  /** Bildschirmposition des Welt-Ursprungs */
  ox = 0;
  oy = 0;

  x(xm: number): number {
    return this.ox + xm * this.scale;
  }
  y(ym: number): number {
    return this.oy - ym * this.scale;
  }
  len(m: number): number {
    return m * this.scale;
  }
  toWorldX(px: number): number {
    return (px - this.ox) / this.scale;
  }
  toWorldY(py: number): number {
    return (this.oy - py) / this.scale;
  }
}

/** Runde Rasterabstände: 1, 2, 5, 10, 20, 50 … */
export function niceStep(rawStep: number): number {
  const exp = Math.floor(Math.log10(rawStep));
  const base = 10 ** exp;
  const f = rawStep / base;
  const nice = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return nice * base;
}
