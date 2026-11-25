<!--
  Simulation: Schiefer Wurf
  Parameter: Abwurfgeschwindigkeit, Winkel, Abwurfhöhe, Ort (Fallbeschleunigung).
  Anzeigen: Bahnkurve, Geschwindigkeitspfeile mit Komponenten, frühere Würfe
  zum Vergleich, Live-Diagramm.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SimLoop } from '../../lib/engine/loop';
  import { createCanvasView, niceStep, Viewport, type CanvasView } from '../../lib/engine/canvas';
  import { arrow, fmt, label } from '../../lib/engine/draw';
  import { theme } from '../../lib/engine/theme';
  import { measurements } from '../../lib/measure/bus.svelte';
  import LivePlot from '../../lib/plot/LivePlot.svelte';
  import type { PlotSeries } from '../../lib/plot/LivePlot.svelte';
  import SimLayout from '../../lib/ui/SimLayout.svelte';
  import Slider from '../../lib/ui/Slider.svelte';
  import Toggle from '../../lib/ui/Toggle.svelte';
  import PlayControls from '../../lib/ui/PlayControls.svelte';
  import Readouts from '../../lib/ui/Readouts.svelte';
  import Segmented from '../../lib/ui/Segmented.svelte';
  import { components, kennwerte, ORTE, stateAt, type WurfParams } from './model';

  // ---------- Parameter (reaktiv) ----------
  let v0 = $state(12);
  let angleDeg = $state(45);
  let h0 = $state(0);
  let g = $state(9.81);
  let showVectors = $state(true);
  let showPrediction = $state(false);
  let keepTrails = $state(true);
  let speed = $state(1);
  let running = $state(false);
  let landed = $state(false);
  let plotQty = $state<'y' | 'x' | 'vy' | 'vx'>('y');

  const params = $derived<WurfParams>({ v0, angleDeg, h0, g });
  const k = $derived(kennwerte(params));

  // ---------- Simulationszustand (nicht reaktiv, wird jeden Frame geändert) ----------
  let t = 0;
  let stepCount = 0;
  const trail = { x: [] as number[], y: [] as number[] };
  interface OldTrail {
    x: number[];
    y: number[];
    text: string;
  }
  let oldTrails = $state.raw<OldTrail[]>([]);
  const buf = { t: [] as number[], x: [] as number[], y: [] as number[], vx: [] as number[], vy: [] as number[] };

  let readout = $state({ t: 0, x: 0, y: 0, v: 0 });
  let lastReadout = 0;

  let canvas: HTMLCanvasElement;
  let view: CanvasView | null = null;
  const vp = new Viewport();
  let plotRef: ReturnType<typeof LivePlot> | undefined = $state();

  const loop = new SimLoop({
    step(dt) {
      if (landed) return;
      t += dt;
      if (++stepCount % 4 === 0 && t < k.flugzeit) sample(); // 60 Messpunkte pro Sekunde
      if (t >= k.flugzeit) {
        t = k.flugzeit;
        sample();
        land();
      }
    },
    afterFrame() {
      pushPlot();
      const now = performance.now();
      if (now - lastReadout > 66 || landed) {
        lastReadout = now;
        const s = stateAt(params, t);
        readout = { t, x: s.x, y: s.y, v: Math.hypot(s.vx, s.vy) };
      }
    },
    render: draw
  });

  function sample() {
    const s = stateAt(params, t);
    trail.x.push(s.x);
    trail.y.push(Math.max(0, s.y));
    buf.t.push(t);
    buf.x.push(s.x);
    buf.y.push(Math.max(0, s.y));
    buf.vx.push(s.vx);
    buf.vy.push(s.vy);
  }

  function land() {
    landed = true;
    loop.pause();
    measurements.set('flugzeit', k.flugzeit);
    measurements.set('wurfweite', k.wurfweite);
    measurements.set('hmax', k.maxHoehe);
  }

  /** Aktuellen Wurf ggf. als Vergleichsspur behalten und neu beginnen. */
  function reset(archive = keepTrails) {
    if (archive && trail.x.length > 1) {
      oldTrails = [
        ...oldTrails.slice(-4),
        { x: trail.x.slice(), y: trail.y.slice(), text: `${fmt(params.angleDeg, 0)}°, ${fmt(params.v0, 1)} m/s` }
      ];
    }
    loop.pause();
    t = 0;
    stepCount = 0;
    landed = false;
    trail.x.length = 0;
    trail.y.length = 0;
    for (const a of Object.values(buf)) a.length = 0;
    sample();
    measurements.set('flugzeit', null);
    measurements.set('wurfweite', null);
    measurements.set('hmax', null);
    readout = { t: 0, x: 0, y: h0, v: v0 };
    fit();
    pushPlot(true);
    loop.invalidate();
  }

  function clearTrails() {
    oldTrails = [];
    fit();
    loop.invalidate();
  }

  function play() {
    if (landed) reset();
    loop.toggle();
  }

  // ---------- Darstellung ----------
  const M = { l: 52, r: 24, t: 24, b: 44 };

  function fit() {
    if (!view) return;
    let maxX = Math.max(k.wurfweite, 4);
    let maxY = Math.max(k.maxHoehe, 2);
    for (const o of oldTrails) {
      maxX = Math.max(maxX, o.x[o.x.length - 1] ?? 0);
      maxY = Math.max(maxY, ...o.y);
    }
    maxX *= 1.06;
    maxY *= 1.12;
    const w = view.width - M.l - M.r;
    const h = view.height - M.t - M.b;
    vp.scale = Math.min(w / maxX, h / maxY);
    vp.ox = M.l;
    vp.oy = view.height - M.b;
  }

  function draw() {
    if (!view) return;
    const { ctx, width: W, height: H } = view;
    const p = params;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // Raster mit Beschriftung
    const step = niceStep(70 / vp.scale);
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.grid;
    ctx.beginPath();
    for (let x = 0; vp.x(x) <= W; x += step) {
      ctx.moveTo(Math.round(vp.x(x)) + 0.5, 0);
      ctx.lineTo(Math.round(vp.x(x)) + 0.5, vp.oy);
    }
    for (let y = 0; vp.y(y) >= 0; y += step) {
      ctx.moveTo(vp.ox, Math.round(vp.y(y)) + 0.5);
      ctx.lineTo(W, Math.round(vp.y(y)) + 0.5);
    }
    ctx.stroke();

    // Boden
    ctx.fillStyle = '#eef3e2';
    ctx.fillRect(0, vp.oy, W, H - vp.oy);
    ctx.strokeStyle = theme.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, vp.oy);
    ctx.lineTo(W, vp.oy);
    ctx.stroke();

    // Abwurfturm
    if (p.h0 > 0) {
      ctx.fillStyle = '#d9dee5';
      ctx.strokeStyle = '#9aa5b1';
      ctx.lineWidth = 1;
      const tw = 22;
      ctx.fillRect(vp.ox - tw, vp.y(p.h0), tw, vp.len(p.h0));
      ctx.strokeRect(vp.ox - tw + 0.5, vp.y(p.h0) + 0.5, tw, vp.len(p.h0));
    }

    const d = step < 1 ? 1 : 0;
    for (let x = step; vp.x(x) <= W - 10; x += step)
      label(ctx, fmt(x, d), vp.x(x), vp.oy + 16, { align: 'center', color: theme.muted, size: 12 });
    for (let y = step; vp.y(y) >= 12; y += step)
      label(ctx, fmt(y, d), vp.ox - 8, vp.y(y) + 4, { align: 'right', color: theme.muted, size: 12 });
    label(ctx, 'x in m', W - M.r, vp.oy + 34, { align: 'right', color: theme.muted, size: 12 });
    label(ctx, 'y in m', 8, 16, { color: theme.muted, size: 12 });

    // Vorhersage der Bahnkurve
    if (showPrediction) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = theme.prediction;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const n = 80;
      for (let i = 0; i <= n; i++) {
        const s = stateAt(p, (k.flugzeit * i) / n);
        if (i === 0) ctx.moveTo(vp.x(s.x), vp.y(s.y));
        else ctx.lineTo(vp.x(s.x), vp.y(Math.max(0, s.y)));
      }
      ctx.stroke();
      ctx.restore();
    }

    // Frühere Würfe
    oldTrails.forEach((o, i) => {
      ctx.save();
      ctx.globalAlpha = 0.25 + (0.35 * (i + 1)) / oldTrails.length;
      polyline(ctx, o.x, o.y, '#9aa5b1', 2);
      // Beschriftung über dem höchsten Punkt der Spur
      let top = 0;
      for (let j = 1; j < o.y.length; j++) if (o.y[j] > o.y[top]) top = j;
      label(ctx, o.text, vp.x(o.x[top]), vp.y(o.y[top]) - 8, { align: 'center', size: 11, color: theme.muted });
      ctx.restore();
    });

    // Aktuelle Spur
    polyline(ctx, trail.x, trail.y, theme.trail, 2.5);

    const s = stateAt(p, t);
    const bx = vp.x(s.x);
    const by = vp.y(Math.max(0, s.y));

    // Winkel-Anzeige vor dem Abwurf
    if (t === 0) {
      const a = (p.angleDeg * Math.PI) / 180;
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 70, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(bx, by, 34, -a, 0);
      ctx.stroke();
      ctx.restore();
      label(ctx, `α = ${fmt(p.angleDeg, 0)}°`, bx + 40, by - 8 - 10 * Math.sin(a), { size: 13 });
    }

    // Höchster Punkt und Wurfweite nach der Landung
    if (landed) {
      const top = stateAt(p, k.steigzeit);
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vp.x(top.x), vp.y(top.y));
      ctx.lineTo(vp.x(top.x), vp.oy);
      ctx.stroke();
      ctx.restore();
      label(ctx, `h_max = ${fmt(k.maxHoehe, 2)} m`, vp.x(top.x) + 6, vp.y(top.y) - 10, { size: 12 });
      label(ctx, `Wurfweite ${fmt(k.wurfweite, 2)} m`, bx, by - 16, { align: 'right', size: 12, bold: true });
    }

    // Geschwindigkeitspfeile
    if (showVectors && !landed) {
      const vs = Math.min(view.width, view.height) * 0.22 / Math.max(p.v0, 1);
      arrow(ctx, bx, by, bx + s.vx * vs, by, theme.velocityX, 2);
      arrow(ctx, bx, by, bx, by - s.vy * vs, theme.velocityY, 2);
      arrow(ctx, bx, by, bx + s.vx * vs, by - s.vy * vs, theme.velocity, 3);
      label(ctx, 'v', bx + s.vx * vs + 6, by - s.vy * vs - 6, { color: theme.velocity, bold: true, size: 14 });
      label(ctx, 'v_x', bx + s.vx * vs + 4, by + 16, { color: theme.velocityX, size: 13 });
      label(ctx, 'v_y', bx + 6, by - s.vy * vs + (s.vy > 0 ? -4 : 14), { color: theme.velocityY, size: 13 });
    }

    // Körper
    ctx.beginPath();
    ctx.arc(bx, by - (landed ? 0 : 0), 9, 0, Math.PI * 2);
    ctx.fillStyle = theme.object;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.objectDark;
    ctx.stroke();
  }

  function polyline(ctx: CanvasRenderingContext2D, xs: number[], ys: number[], color: string, width: number) {
    if (xs.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(vp.x(xs[0]), vp.y(ys[0]));
    for (let i = 1; i < xs.length; i++) ctx.lineTo(vp.x(xs[i]), vp.y(ys[i]));
    ctx.stroke();
  }

  // ---------- Diagramm ----------
  const plotDefs: Record<typeof plotQty, PlotSeries> = {
    y: { label: 'Höhe y', axis: 'y', color: theme.object, unit: 'm' },
    x: { label: 'Weite x', axis: 'x', color: theme.acceleration, unit: 'm' },
    vy: { label: 'senkrechte Geschwindigkeit vy', axis: 'vy', color: theme.velocityY, unit: 'm/s' },
    vx: { label: 'waagerechte Geschwindigkeit vx', axis: 'vx', color: theme.velocityX, unit: 'm/s' }
  };
  const plotSeries = $derived([plotDefs[plotQty]]);
  const xRange = $derived<[number, number]>([0, Math.max(k.flugzeit, 0.1)]);

  function pushPlot(force = false) {
    plotRef?.update([buf.t, buf[plotQty]], force);
  }

  $effect(() => {
    void plotQty;
    untrack(() => pushPlot(true));
  });

  // ---------- Reaktion auf Parameter ----------
  $effect(() => {
    void params;
    untrack(() => {
      if (!view) return;
      reset(landed && keepTrails);
      publishParams();
    });
  });

  $effect(() => {
    void showVectors;
    void showPrediction;
    loop.invalidate();
  });

  $effect(() => {
    loop.timeScale = speed;
  });

  function publishParams() {
    measurements.set('v0', v0);
    measurements.set('alpha', angleDeg);
    measurements.set('h0', h0);
    measurements.set('g', g);
  }

  onMount(() => {
    measurements.define(
      [
        { key: 'v0', label: 'Abwurfgeschwindigkeit', symbol: 'v₀', unit: 'm/s', digits: 1 },
        { key: 'alpha', label: 'Abwurfwinkel', symbol: 'α', unit: '°', digits: 0 },
        { key: 'h0', label: 'Abwurfhöhe', symbol: 'h₀', unit: 'm', digits: 1 },
        { key: 'g', label: 'Fallbeschleunigung', symbol: 'g', unit: 'm/s²', digits: 2 },
        { key: 'flugzeit', label: 'Flugzeit', symbol: 't_F', unit: 's', digits: 2 },
        { key: 'wurfweite', label: 'Wurfweite', symbol: 'x_W', unit: 'm', digits: 2 },
        { key: 'hmax', label: 'maximale Höhe', symbol: 'h_max', unit: 'm', digits: 2 }
      ],
      'Schiefer Wurf'
    );
    measurements.snapshot = () => canvas.toDataURL('image/png');
    view = createCanvasView(canvas, () => {
      fit();
      loop.invalidate();
    });
    reset(false);
    publishParams();
    const off = loop.onRunningChange((r) => (running = r));
    loop.attach();
    return () => {
      off();
      loop.detach();
      view?.destroy();
      measurements.clear();
    };
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === ' ' && e.target === canvas) {
      e.preventDefault();
      play();
    }
  }
</script>

<SimLayout>
  {#snippet stage()}
    <canvas
      bind:this={canvas}
      tabindex="0"
      aria-label="Schiefer Wurf: Bahnkurve eines geworfenen Körpers"
      onkeydown={onKey}
    ></canvas>
  {/snippet}

  {#snippet toolbar()}
    <PlayControls
      {running}
      bind:speed
      playLabel={landed ? 'Neuer Wurf' : readout.t > 0 ? 'Weiter' : 'Abwurf'}
      onplay={play}
      onreset={() => reset()}
      onstep={() => (landed ? undefined : loop.stepOnce())}
    />
    {#if oldTrails.length}
      <button class="btn" onclick={clearTrails}>Spuren löschen</button>
    {/if}
  {/snippet}

  {#snippet readouts()}
    <Readouts
      items={[
        { symbol: 't', value: readout.t, unit: 's' },
        { symbol: 'x', value: readout.x, unit: 'm' },
        { symbol: 'y', value: readout.y, unit: 'm' },
        { symbol: 'v', value: readout.v, unit: 'm/s', title: 'Betrag der Geschwindigkeit' }
      ]}
    />
  {/snippet}

  {#snippet controls()}
    <Slider label="Abwurfgeschwindigkeit v₀" bind:value={v0} min={1} max={30} step={0.5} unit="m/s" disabled={running} />
    <Slider label="Abwurfwinkel α" bind:value={angleDeg} min={0} max={90} step={1} digits={0} unit="°" disabled={running} />
    <Slider label="Abwurfhöhe h₀" bind:value={h0} min={0} max={20} step={0.5} unit="m" disabled={running} />
    <label class="select">
      <span>Ort</span>
      <select bind:value={g} disabled={running}>
        {#each ORTE as o (o.name)}
          <option value={o.g}>{o.name} (g = {fmt(o.g, 2)} m/s²)</option>
        {/each}
      </select>
    </label>
    <div class="toggles">
      <Toggle label="Geschwindigkeitspfeile" bind:checked={showVectors} />
      <Toggle label="Bahn vorhersagen" bind:checked={showPrediction} />
      <Toggle label="Frühere Würfe behalten" bind:checked={keepTrails} />
    </div>
    {#if landed}
      <p class="result">
        Flugzeit <b>{fmt(k.flugzeit, 2)} s</b> · Wurfweite <b>{fmt(k.wurfweite, 2)} m</b> · max. Höhe
        <b>{fmt(k.maxHoehe, 2)} m</b>
      </p>
    {/if}
  {/snippet}

  {#snippet plot()}
    <Segmented
      label="Größe im Diagramm"
      bind:value={plotQty}
      options={[
        { value: 'y', label: 'y(t)' },
        { value: 'x', label: 'x(t)' },
        { value: 'vy', label: 'v_y(t)' },
        { value: 'vx', label: 'v_x(t)' }
      ]}
    />
    <LivePlot bind:this={plotRef} series={plotSeries} {xRange} />
  {/snippet}
</SimLayout>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  canvas:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent) 40%, transparent);
    outline-offset: -3px;
  }
  .select {
    display: grid;
    gap: 4px;
    font-size: 0.92rem;
  }
  .select select {
    min-height: 40px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0 8px;
    background: var(--surface);
  }
  .toggles {
    display: grid;
    gap: 2px;
  }
  .result {
    margin: 0;
    padding: 8px 10px;
    background: var(--accent-soft);
    border-radius: var(--radius-sm);
    font-size: 0.92rem;
  }
</style>
