<!--
  Gemeinsamer Rahmen aller Simulationen: Zeichenfläche, Start/Pause,
  Messanzeige, Regler, Anzeigeoptionen, Voreinstellungen und Diagramm.
  Alles außer der Zeichnung selbst entsteht aus der Beschreibung der
  Simulation (SimDef) und den Anpassungen der Lerneinheit (SimConfig).
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createCanvasView, type CanvasView } from '../engine/canvas';
  import { SimLoop } from '../engine/loop';
  import { measurements } from '../measure/bus.svelte';
  import Plot from '../plot/Plot.svelte';
  import PlayControls from '../ui/PlayControls.svelte';
  import Readouts, { type Readout } from '../ui/Readouts.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Slider from '../ui/Slider.svelte';
  import Toggle from '../ui/Toggle.svelte';
  import { digitsFor, resolveSim } from './resolve';
  import type { PointerKind, SimConfig, SimDef, SimEnv, Stage } from './types';

  let { def, config }: { def: SimDef; config?: SimConfig } = $props();

  // Der Rahmen wird bei jeder Änderung der Konfiguration neu aufgebaut
  // (siehe {#key} beim Aufrufer), daher genügt hier der Anfangswert.
  const R = untrack(() => resolveSim(def, config));
  const D = untrack(() => def);

  const p: Record<string, number> = Object.fromEntries(R.params.map((x) => [x.key, x.value]));
  const show: Record<string, boolean> = Object.fromEntries(R.options.map((x) => [x.key, x.value]));
  let values = $state({ ...p });
  let flags = $state({ ...show });
  let plotKey = $state(R.plots[0]?.key ?? '');
  let running = $state(false);
  let finished = $state(false);
  let started = $state(false);
  let speed = $state(1);
  let readouts = $state<Readout[]>([]);

  let canvas: HTMLCanvasElement;
  let view: CanvasView | null = null;
  let plotRef: ReturnType<typeof Plot> | undefined = $state();
  let lastPublish = 0;

  const env: SimEnv = {
    p,
    show,
    invalidate: () => loop.invalidate(),
    finish: () => {
      finished = true;
      loop.pause();
      publish(true);
    },
    play: () => {
      started = true;
      loop.play();
    },
    isRunning: () => loop.isRunning
  };
  const loop = new SimLoop({
    step: (dt) => rt.step?.(dt),
    afterFrame: () => publish(false),
    render: draw
  });
  const rt = D.create(env);

  const stage = (): Stage => ({ ctx: view!.ctx, w: view!.width, h: view!.height });

  function draw() {
    if (view) rt.draw(stage());
  }

  /** Messwerte an Anzeige, Arbeitsblatt und Diagramm weitergeben. */
  function publish(force: boolean) {
    const now = performance.now();
    if (!force && now - lastPublish < 66) return;
    lastPublish = now;
    const m = rt.measure();
    readouts = D.measures
      .filter((d) => d.readout !== false)
      .map((d) => ({ symbol: d.symbol, value: m[d.key] ?? null, unit: d.unit, digits: d.digits, title: d.label }));
    for (const d of D.measures) measurements.set(d.key, m[d.key] ?? null);
    if (plotRef && plotKey && rt.plot) plotRef.set(rt.plot(plotKey));
  }

  function reset() {
    loop.pause();
    finished = false;
    started = false;
    rt.reset();
    publish(true);
    loop.invalidate();
  }

  function setParam(key: string, v: number) {
    values[key] = v;
    p[key] = v;
    measurements.set(key, v);
    const d = R.params.find((x) => x.key === key);
    if (D.animated && !d?.live) reset();
    else {
      rt.update?.(key);
      publish(true);
      loop.invalidate();
    }
  }

  function setFlag(key: string, v: boolean) {
    flags[key] = v;
    show[key] = v;
    publish(true);
    loop.invalidate();
  }

  function applyPreset(vals: Record<string, number>) {
    for (const [k, v] of Object.entries(vals)) {
      values[k] = v;
      p[k] = v;
      measurements.set(k, v);
    }
    if (D.animated) reset();
    else {
      rt.update?.('');
      publish(true);
      loop.invalidate();
    }
  }
  const presetActive = (vals: Record<string, number>) =>
    Object.entries(vals).every(([k, v]) => Math.abs((values[k] ?? NaN) - v) < 1e-9);

  function play() {
    if (finished) {
      reset();
      started = true;
      loop.play();
      return;
    }
    started = true;
    loop.toggle();
  }

  // ---------- Maus/Finger ----------
  let captured = false;
  function pointer(kind: PointerKind, e: PointerEvent) {
    if (!rt.pointer || !view) return;
    if (kind === 'up' && !captured) return;
    const r = canvas.getBoundingClientRect();
    const cursor = rt.pointer(kind, e.clientX - r.left, e.clientY - r.top, stage());
    if (kind === 'down' && cursor) {
      captured = true;
      canvas.setPointerCapture(e.pointerId);
    }
    if (kind === 'up') {
      captured = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      publish(true);
    }
    canvas.style.cursor = cursor || '';
    loop.invalidate();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === ' ' && D.animated) {
      e.preventDefault();
      play();
    }
  }

  $effect(() => {
    loop.timeScale = speed;
  });
  $effect(() => {
    void plotKey;
    untrack(() => publish(true));
  });

  onMount(() => {
    measurements.define(
      [
        ...R.params.map((x) => ({
          key: x.key,
          label: x.label,
          symbol: x.symbol ?? x.label,
          unit: x.unit,
          digits: x.digits ?? digitsFor(x.step)
        })),
        ...D.measures.map(({ key, label, symbol, unit, digits }) => ({ key, label, symbol, unit, digits }))
      ],
      D.title
    );
    for (const x of R.params) measurements.set(x.key, x.value);
    measurements.snapshot = () => canvas.toDataURL('image/png');
    view = createCanvasView(canvas, () => loop.invalidate());
    reset();
    document.fonts?.ready.then(() => loop.invalidate());
    const off = loop.onRunningChange((r) => (running = r));
    loop.attach();
    return () => {
      off();
      loop.detach();
      view?.destroy();
      measurements.clear();
    };
  });

  const visibleParams = R.params.filter((x) => !x.hidden);
  const visibleOptions = R.options.filter((x) => !x.hidden);
  const plot = $derived(R.plots.find((x) => x.key === plotKey));
</script>

<div class="sim">
  <div class="stage">
    <canvas
      bind:this={canvas}
      tabindex="0"
      aria-label={`Simulation: ${D.title}`}
      onpointerdown={(e) => pointer('down', e)}
      onpointermove={(e) => pointer('move', e)}
      onpointerup={(e) => pointer('up', e)}
      onpointercancel={(e) => pointer('up', e)}
      onkeydown={onKey}
    ></canvas>
  </div>

  <div class="bar">
    {#if D.animated}
      <div class="tools">
        <PlayControls
          {running}
          {finished}
          {speed}
          playLabel={started ? 'Weiter' : (D.playLabel ?? 'Start')}
          onplay={play}
          onreset={reset}
          onstep={() => {
            started = true;
            loop.stepOnce();
          }}
          onspeed={(v) => (speed = v)}
        />
      </div>
    {/if}
    {#if readouts.length}<div class="read"><Readouts items={readouts} /></div>{/if}
  </div>

  <div class="lower" class:single={!plot}>
    {#if visibleParams.length || visibleOptions.length || R.presets.length}
      <section class="panel controls" aria-label="Einstellungen">
        <h3 class="eyebrow">Einstellungen</h3>
        {#if R.presets.length}
          <div class="presets">
            {#each R.presets as pr (pr.name)}
              <button class="chip" class:active={presetActive(pr.values)} onclick={() => applyPreset(pr.values)}
                >{pr.name}</button
              >
            {/each}
          </div>
        {/if}
        {#each visibleParams as x (x.key)}
          {#if x.choices}
            <div class="choice">
              <span>{x.label}</span>
              <Segmented
                label={x.label}
                options={x.choices}
                value={values[x.key]}
                disabled={x.locked}
                onchange={(v) => setParam(x.key, v)}
              />
            </div>
          {:else}
            <Slider
              label={x.label}
              value={values[x.key]}
              min={x.min}
              max={x.max}
              step={x.step}
              unit={x.unit}
              digits={x.digits ?? digitsFor(x.step)}
              disabled={x.locked}
              onchange={(v) => setParam(x.key, v)}
            />
          {/if}
        {/each}
        {#if visibleOptions.length}
          <div class="toggles">
            {#each visibleOptions as o (o.key)}
              <Toggle label={o.label} checked={flags[o.key]} onchange={(v) => setFlag(o.key, v)} />
            {/each}
          </div>
        {/if}
        {#if D.hint}<p class="hint muted">{D.hint}</p>{/if}
      </section>
    {/if}
    {#if plot}
      <section class="panel" aria-label="Diagramm">
        <div class="plothead">
          <h3 class="eyebrow">Diagramm</h3>
          {#if R.plots.length > 1}
            <Segmented
              label="Größe im Diagramm"
              options={R.plots.map((x) => ({ value: x.key, label: x.label }))}
              value={plotKey}
              onchange={(v) => (plotKey = v)}
            />
          {/if}
        </div>
        <Plot bind:this={plotRef} spec={plot} />
      </section>
    {/if}
  </div>
</div>

<style>
  .sim {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .stage {
    position: relative;
    background: var(--sheet);
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    box-shadow: var(--stack);
    overflow: hidden;
    height: clamp(270px, 50vh, 540px);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  canvas:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--signal) 55%, transparent);
    outline-offset: -3px;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 14px;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .read {
    flex: 1 1 260px;
    min-width: 0;
  }
  .lower {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .panel {
    background: var(--sheet);
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    padding: 10px 14px 12px;
    min-width: 0;
  }
  .panel h3 {
    margin: 0 0 6px;
  }
  .controls {
    display: grid;
    gap: 10px;
    align-content: start;
  }
  .controls h3 {
    margin: 0;
  }
  .plothead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    margin-bottom: 6px;
  }
  .plothead h3 {
    margin: 0;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    border: 1.5px solid var(--ink);
    border-radius: 999px;
    background: var(--sheet);
    padding: 3px 12px;
    min-height: 32px;
    font-size: 0.88rem;
    font-weight: 600;
  }
  .chip.active {
    background: var(--marker);
  }
  .choice {
    display: grid;
    gap: 4px;
    font-size: 0.93rem;
  }
  .toggles {
    display: grid;
    gap: 0;
    padding-top: 6px;
    border-top: 1px dashed var(--line);
  }
  .hint {
    margin: 0;
    font-size: 0.84rem;
  }
  @container (min-width: 760px) {
    .lower:not(.single) {
      grid-template-columns: minmax(250px, 1fr) 1.7fr;
    }
    .lower.single .controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 28px;
    }
    .lower.single .controls > :is(h3, .presets, .toggles, .hint) {
      grid-column: 1 / -1;
    }
  }
</style>
