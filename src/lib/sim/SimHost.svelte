<!--
  Gemeinsamer Rahmen aller Simulationen: Zeichenfläche, Start/Pause,
  Messanzeige, Regler, Anzeigeoptionen, Voreinstellungen und Diagramm.
  Alles außer der Zeichnung selbst entsteht aus der Beschreibung der
  Simulation (SimDef) und den Anpassungen der Lerneinheit (SimConfig).

  fill: Der Rahmen füllt die Höhe seines Elternelements. Die Zeichenfläche
  nimmt den Platz, den Regler und Diagramm übrig lassen; so passt alles ohne
  Scrollen neben das Arbeitsblatt.
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

  let { def, config, fill = false }: { def: SimDef; config?: SimConfig; fill?: boolean } = $props();

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

  const paramByKey = (key: string) => R.params.find((x) => x.key === key);
  const canSet = (key: string) => {
    const d = paramByKey(key);
    return !!d && !d.locked && !d.hidden;
  };

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
    isRunning: () => loop.isRunning,
    canSet,
    set: (key, v) => {
      const d = paramByKey(key);
      if (!d || !canSet(key)) return p[key];
      let x: number;
      if (d.choices) x = d.choices.some((c) => c.value === v) ? v : p[key];
      else {
        x = Math.min(d.max, Math.max(d.min, v));
        x = d.min + Math.round((x - d.min) / d.step) * d.step;
        x = Number(x.toFixed(Math.min(10, digitsFor(d.step) + 2)));
        x = Math.min(d.max, Math.max(d.min, x));
      }
      if (x !== p[key]) setParam(key, x);
      return x;
    }
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
    const d = paramByKey(key);
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
  const sliders = visibleParams.filter((x) => !x.choices);
  const choices = visibleParams.filter((x) => x.choices);
  const visibleOptions = R.options.filter((x) => !x.hidden);
  const plot = $derived(R.plots.find((x) => x.key === plotKey));
  const hasControls = visibleParams.length > 0 || visibleOptions.length > 0 || R.presets.length > 0;
</script>

<div class="sim" class:fill>
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
    {#if D.hint}
      <details class="hint">
        <summary aria-label="Hinweis zur Simulation" title="Hinweis zur Simulation">i</summary>
        <p>{D.hint}</p>
      </details>
    {/if}
  </div>

  {#if D.animated || readouts.length}
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
  {/if}

  {#if hasControls || plot}
    <div class="lower" class:single={!plot || !hasControls}>
      {#if hasControls}
        <section class="panel controls" aria-label="Einstellungen">
          {#if R.presets.length || choices.length}
            <div class="row">
              {#each choices as x (x.key)}
                <div class="choice">
                  <span>{x.label}</span>
                  <Segmented
                    label={x.label}
                    options={x.choices!}
                    value={values[x.key]}
                    disabled={x.locked}
                    onchange={(v) => setParam(x.key, v)}
                  />
                </div>
              {/each}
              {#if R.presets.length}
                <div class="presets">
                  {#each R.presets as pr (pr.name)}
                    <button class="chip" class:active={presetActive(pr.values)} onclick={() => applyPreset(pr.values)}
                      >{pr.name}</button
                    >
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
          {#if sliders.length}
            <div class="sliders">
              {#each sliders as x (x.key)}
                <Slider
                  label={x.label}
                  symbol={x.symbol}
                  value={values[x.key]}
                  min={x.min}
                  max={x.max}
                  step={x.step}
                  unit={x.unit}
                  digits={x.digits ?? digitsFor(x.step)}
                  disabled={x.locked}
                  onchange={(v) => setParam(x.key, v)}
                />
              {/each}
            </div>
          {/if}
          {#if visibleOptions.length}
            <div class="toggles">
              {#each visibleOptions as o (o.key)}
                <Toggle label={o.label} checked={flags[o.key]} onchange={(v) => setFlag(o.key, v)} />
              {/each}
            </div>
          {/if}
        </section>
      {/if}
      {#if plot}
        <section class="panel plotpanel" aria-label="Diagramm">
          {#if R.plots.length > 1}
            <div class="plothead">
              <Segmented
                label="Größe im Diagramm"
                options={R.plots.map((x) => ({ value: x.key, label: x.label }))}
                value={plotKey}
                onchange={(v) => (plotKey = v)}
              />
            </div>
          {/if}
          <Plot bind:this={plotRef} spec={plot} height={fill ? 180 : 230} />
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sim {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  /* Füllmodus: Die Zeichenfläche bekommt den Rest der Höhe. */
  .fill {
    height: 100%;
  }
  .fill .stage {
    flex: 1 1 0;
    height: auto;
    min-height: 220px;
  }
  .fill > :not(.stage) {
    flex: none;
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
  .hint {
    position: absolute;
    left: 8px;
    bottom: 8px;
    max-width: min(520px, calc(100% - 16px));
    font-size: 0.84rem;
  }
  .hint summary {
    list-style: none;
    width: 26px;
    height: 26px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    background: var(--sheet);
    display: grid;
    place-items: center;
    font-family: var(--math);
    font-style: italic;
    font-weight: 700;
    cursor: pointer;
  }
  .hint summary::-webkit-details-marker {
    display: none;
  }
  .hint[open] summary {
    background: var(--ink);
    color: var(--sheet);
  }
  .hint p {
    margin: 6px 0 0;
    padding: 8px 10px;
    background: var(--sheet);
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    box-shadow: var(--stack);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .read {
    flex: 1 1 260px;
    min-width: 0;
  }
  .lower {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .panel {
    background: var(--sheet);
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    padding: 8px 12px 10px;
    min-width: 0;
  }
  .controls {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
  }
  .sliders {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 4px 20px;
  }
  .plotpanel {
    display: grid;
    gap: 4px;
    align-content: start;
    padding: 6px 8px;
  }
  .plothead {
    display: flex;
    justify-content: flex-end;
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
    padding: 2px 11px;
    min-height: 30px;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .chip.active {
    background: var(--marker);
  }
  .choice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    font-size: 0.88rem;
  }
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px dashed var(--line);
  }
  @container (min-width: 700px) {
    .lower:not(.single) {
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    }
  }
</style>
