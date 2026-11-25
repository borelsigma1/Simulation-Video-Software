<!-- Diagramm-Fläche. Daten kommen über `set()`, gezeichnet wird höchstens einmal pro Frame. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createCanvasView, type CanvasView } from '../engine/canvas';
  import type { PlotData } from '../sim/types';
  import { drawPlot, type PlotSpec } from './draw';

  let { spec, height = 230, data = null }: { spec: PlotSpec; height?: number; data?: PlotData | null } = $props();

  let canvas: HTMLCanvasElement;
  let view: CanvasView | null = null;
  let current: PlotData = { x: [], ys: [] };

  function paint() {
    if (view) drawPlot(view.ctx, view.width, view.height, spec, current);
  }

  export function set(d: PlotData) {
    current = d;
    paint();
  }
  export function toDataURL(): string {
    return canvas.toDataURL('image/png');
  }

  $effect(() => {
    void spec;
    if (data) current = data;
    paint();
  });

  onMount(() => {
    view = createCanvasView(canvas, paint);
    document.fonts?.ready.then(paint);
    return () => view?.destroy();
  });
</script>

<canvas bind:this={canvas} style:height={`${height}px`} aria-label={`Diagramm: ${spec.yLabel} über ${spec.xLabel}`}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
  }
</style>
