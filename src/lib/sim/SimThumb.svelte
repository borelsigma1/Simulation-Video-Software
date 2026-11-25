<!--
  Vorschaubild einer Simulation für die Übersicht: Die Simulation zeichnet
  sich selbst (ein Standbild), es gibt also keine getrennten Bilddateien.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolveSim } from './resolve';
  import type { SimConfig, SimDef } from './types';

  let { def, config }: { def: SimDef; config?: SimConfig } = $props();
  let canvas: HTMLCanvasElement;
  const W = 560;
  const H = 320;

  function paint() {
    const R = resolveSim(def, config);
    const env = {
      p: Object.fromEntries(R.params.map((x) => [x.key, x.value])),
      show: Object.fromEntries(R.options.map((x) => [x.key, x.value])),
      invalidate() {},
      finish() {},
      play() {},
      isRunning: () => true
    };
    const rt = def.create(env);
    rt.reset();
    if (rt.step && def.thumbTime) for (let t = 0; t < def.thumbTime; t += 1 / 240) rt.step(1 / 240);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || 280;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(((cw * H) / W) * dpr);
    const ctx = canvas.getContext('2d')!;
    const k = canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    rt.draw({ ctx, w: W, h: H });
  }

  onMount(() => {
    paint();
    document.fonts?.ready.then(paint);
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => ro.disconnect();
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    aspect-ratio: 560 / 320;
  }
</style>
