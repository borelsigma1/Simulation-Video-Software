<!--
  Live-Diagramm auf Basis von uPlot (sehr schnell, auch mit vielen Punkten).
  Die Simulation schiebt Daten per `update()` hinein; das Diagramm zeichnet
  höchstens ~30-mal pro Sekunde neu, damit die Simulation flüssig bleibt.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';

  export interface PlotSeries {
    label: string;
    /** Kurzzeichen für die Achsenbeschriftung, z. B. "s" -> "s in m" */
    axis?: string;
    color: string;
    unit: string;
  }

  interface Props {
    series: PlotSeries[];
    xLabel?: string;
    /** Feste x-Achse [min, max] oder gleitendes Fenster in Sekunden */
    xRange?: [number, number] | { window: number };
    /** Optional feste y-Achse */
    yRange?: [number, number];
    height?: number;
  }

  let { series, xLabel = 't in s', xRange = { window: 10 }, yRange, height = 220 }: Props = $props();

  let host: HTMLDivElement;
  let plot: uPlot | null = null;
  let pending: uPlot.AlignedData | null = null;
  let lastDraw = 0;
  let raf = 0;
  /** Größter x-Wert der aktuellen Daten (für das gleitende Zeitfenster) */
  let latestX = 0;

  const de = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 3 });

  function build() {
    plot?.destroy();
    const first = series[0];
    const yLabel = first ? `${first.axis ?? ''} in ${first.unit}`.trim() : '';
    const opts: uPlot.Options = {
      width: Math.max(200, host.clientWidth),
      height,
      legend: { show: series.length > 1, live: false },
      cursor: { show: false },
      scales: {
        x: {
          time: false,
          range: () => {
            const r = xRange;
            if (Array.isArray(r)) return [r[0], r[1]];
            const max = Math.max(r.window, latestX);
            return [max - r.window, max];
          }
        },
        y: {
          range: (_u, dmin, dmax) => {
            if (yRange) return [yRange[0], yRange[1]];
            if (dmin == null || dmax == null || !Number.isFinite(dmin)) return [-1, 1];
            const pad = Math.max((dmax - dmin) * 0.1, 1e-3);
            return [dmin - pad, dmax + pad];
          }
        }
      },
      axes: [
        { label: xLabel, values: (_u, vals) => vals.map(de), stroke: '#5b6573', grid: { stroke: '#eef1f5' } },
        {
          label: yLabel,
          values: (_u, vals) => vals.map(de),
          stroke: '#5b6573',
          grid: { stroke: '#eef1f5' },
          size: 60
        }
      ],
      series: [
        {},
        ...series.map((s) => ({ label: s.label, stroke: s.color, width: 2, points: { show: false } }))
      ]
    };
    plot = new uPlot(opts, [[], ...series.map(() => [])] as uPlot.AlignedData, host);
  }

  /** Neue Daten übergeben: [x[], y1[], y2[], …]. Arrays werden nicht kopiert. */
  export function update(data: uPlot.AlignedData, force = false) {
    pending = data;
    const xs = data[0];
    latestX = xs.length ? (xs[xs.length - 1] as number) : 0;
    const now = performance.now();
    if (force || now - lastDraw > 33) flush();
    else if (!raf) raf = requestAnimationFrame(flush);
  }

  function flush() {
    raf = 0;
    if (!plot || !pending) return;
    lastDraw = performance.now();
    plot.setData(pending, true);
  }

  onMount(() => {
    build();
    const ro = new ResizeObserver(() => {
      if (plot && host.clientWidth > 0) plot.setSize({ width: host.clientWidth, height });
    });
    ro.observe(host);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      plot?.destroy();
      plot = null;
    };
  });

  // Bei Wechsel der Größe(n) Diagramm neu aufbauen
  $effect(() => {
    void series;
    void yRange;
    if (host && plot) {
      build();
      if (pending) plot.setData(pending, true);
    }
  });

  // Achsenbereich geändert -> neu skalieren
  $effect(() => {
    void xRange;
    if (plot && pending) plot.setData(pending, true);
  });
</script>

<div class="liveplot" bind:this={host}></div>

<style>
  .liveplot {
    width: 100%;
    min-width: 0;
  }
  .liveplot :global(.u-legend) {
    font-size: 0.85rem;
  }
</style>
