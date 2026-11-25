<!--
  Simulation: Federpendel (vertikal)
  Parameter: Masse, Federkonstante, Dämpfung, Startauslenkung.
  Der Körper lässt sich mit Maus/Finger greifen und auslenken.
  Die Periodendauer wird wie mit einer Stoppuhr an den Nulldurchgängen gemessen.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SimLoop } from '../../lib/engine/loop';
  import { createCanvasView, Viewport, type CanvasView } from '../../lib/engine/canvas';
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
  import { acceleration, energien, PeriodenMesser, rk4Step, type PendelParams, type PendelState } from './model';

  const S_MAX = 0.3; // größte Auslenkung in m

  // ---------- Parameter ----------
  let m = $state(0.5);
  let D = $state(20);
  let b = $state(0);
  let s0 = $state(0.15);
  let speed = $state(1);
  let running = $state(false);
  let showVelocity = $state(true);
  let showForce = $state(true);
  let plotQty = $state<'s' | 'v' | 'a' | 'E'>('s');

  const params = $derived<PendelParams>({ m, D, b });

  // ---------- Zustand ----------
  const st: PendelState = { t: 0, s: 0, v: 0 };
  const messer = new PeriodenMesser();
  const WINDOW = 10;
  const buf = {
    t: [] as number[],
    s: [] as number[],
    v: [] as number[],
    a: [] as number[],
    ek: [] as number[],
    ep: [] as number[],
    eg: [] as number[]
  };
  let stepCount = 0;
  let ampRef = $state(0.15);
  let readout = $state({ t: 0, s: 0, v: 0, T: null as number | null });
  let lastReadout = 0;
  let dragging = false;
  let wasRunning = false;

  let canvas: HTMLCanvasElement;
  let view: CanvasView | null = null;
  const vp = new Viewport();
  let plotRef: ReturnType<typeof LivePlot> | undefined = $state();
  let ceilY = 0;

  const SAMPLE_EVERY = 4; // 240 Hz / 4 = 60 Messpunkte pro Sekunde

  const loop = new SimLoop({
    step(dt) {
      if (dragging) return;
      rk4Step(params, st, dt);
      messer.update(st.t, st.s);
      if (++stepCount % SAMPLE_EVERY === 0) sample();
    },
    afterFrame() {
      pushPlot();
      const now = performance.now();
      if (now - lastReadout > 66) {
        lastReadout = now;
        readout = { t: st.t, s: st.s, v: st.v, T: messer.periode };
        measurements.set('T', messer.periode);
        measurements.set('f', messer.periode ? 1 / messer.periode : null);
        measurements.set('amp', messer.amplitude);
      }
    },
    render: draw
  });

  function sample() {
    const e = energien(params, st);
    buf.t.push(st.t);
    buf.s.push(st.s);
    buf.v.push(st.v);
    buf.a.push(acceleration(params, st.s, st.v));
    buf.ek.push(e.kin);
    buf.ep.push(e.pot);
    buf.eg.push(e.ges);
    const tooOld = buf.t.length > WINDOW * 60 + 30;
    if (tooOld) for (const a of Object.values(buf)) a.shift();
  }

  function reset() {
    loop.pause();
    st.t = 0;
    st.s = s0;
    st.v = 0;
    stepCount = 0;
    messer.reset();
    ampRef = s0;
    for (const a of Object.values(buf)) a.length = 0;
    sample();
    readout = { t: 0, s: st.s, v: 0, T: null };
    measurements.set('T', null);
    measurements.set('f', null);
    measurements.set('amp', null);
    pushPlot(true);
    loop.invalidate();
  }

  // ---------- Darstellung ----------
  function layout() {
    if (!view) return;
    const H = view.height;
    ceilY = 28;
    const yEq = Math.round(H * 0.5);
    const half = 32; // halbe maximale Körpergröße
    const up = (yEq - ceilY - 50 - half) / S_MAX;
    const down = (H - 14 - half - yEq) / S_MAX;
    vp.scale = Math.max(40, Math.min(up, down));
    vp.ox = Math.round(view.width * 0.42);
    vp.oy = yEq;
  }

  /** Bildschirm-y der Oberkante des Körpers; die Körpermitte liegt bei der Auslenkung s. */
  const massTop = (s: number) => vp.oy + s * vp.scale - massSize() / 2;
  const massSize = () => 30 + 24 * Math.sqrt(m);

  function draw() {
    if (!view) return;
    const { ctx, width: W, height: H } = view;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);
    const cx = vp.ox;

    // Decke
    ctx.fillStyle = '#d9dee5';
    ctx.fillRect(cx - 90, 0, 180, ceilY);
    ctx.strokeStyle = '#9aa5b1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cx - 90; x < cx + 90; x += 12) {
      ctx.moveTo(x, ceilY);
      ctx.lineTo(x + 12, 0);
    }
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 90, ceilY);
    ctx.lineTo(cx + 90, ceilY);
    ctx.stroke();

    // Maßstab rechts (in cm, 0 = Ruhelage)
    const rx = cx + 120;
    const cm = vp.scale / 100;
    const tickStep = cm * 5 < 14 ? 10 : 5;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx + 0.5, vp.oy - S_MAX * vp.scale);
    ctx.lineTo(rx + 0.5, vp.oy + S_MAX * vp.scale);
    for (let c = -30; c <= 30; c += tickStep) {
      const y = Math.round(vp.oy + c * cm) + 0.5;
      const big = c % 10 === 0;
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + (big ? 10 : 6), y);
    }
    ctx.stroke();
    for (let c = -30; c <= 30; c += 10)
      label(ctx, `${c > 0 ? '+' : ''}${c}`, rx + 14, vp.oy + c * cm + 4, { size: 12, color: theme.muted });
    label(ctx, 's in cm', rx, vp.oy - S_MAX * vp.scale - 10, { size: 12, color: theme.muted });

    // Ruhelage
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = theme.prediction;
    ctx.beginPath();
    ctx.moveTo(cx - 110, vp.oy + 0.5);
    ctx.lineTo(rx, vp.oy + 0.5);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'Ruhelage', cx - 112, vp.oy - 6, { size: 12, color: theme.muted, align: 'right' });

    // Feder (Zickzack)
    const top = massTop(st.s);
    const size = massSize();
    const coils = 14;
    const springLen = top - ceilY;
    const lead = 10;
    const amp = 13;
    ctx.strokeStyle = theme.spring;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, ceilY);
    ctx.lineTo(cx, ceilY + lead);
    const body = springLen - 2 * lead;
    for (let i = 0; i < coils; i++) {
      const y = ceilY + lead + (body * (i + 0.5)) / coils;
      ctx.lineTo(cx + (i % 2 === 0 ? amp : -amp), y);
    }
    ctx.lineTo(cx, top - lead);
    ctx.lineTo(cx, top);
    ctx.stroke();

    // Körper
    ctx.fillStyle = theme.object;
    ctx.strokeStyle = theme.objectDark;
    ctx.lineWidth = 2;
    roundRect(ctx, cx - size / 2, top, size, size, 5);
    ctx.fill();
    ctx.stroke();
    label(ctx, `${fmt(m, 2)} kg`, cx, top + size / 2 + 4, { align: 'center', color: '#fff', bold: true, size: 12 });

    // Pfeile (an der Körpermitte)
    const my = top + size / 2;
    if (showForce) {
      const F = -params.D * st.s - params.b * st.v;
      const fScale = (S_MAX * vp.scale * 0.6) / Math.max(params.D * S_MAX * 0.5, 1e-6);
      arrow(ctx, cx - size / 2 - 14, my, cx - size / 2 - 14, my + F * fScale, theme.force, 3);
      if (Math.abs(F * fScale) > 12)
        label(ctx, 'F', cx - size / 2 - 32, my + F * fScale * 0.5 + 4, { color: theme.force, bold: true, size: 14 });
    }
    if (showVelocity) {
      const omega = Math.sqrt(params.D / params.m);
      const vScale = (S_MAX * vp.scale * 0.6) / Math.max(omega * S_MAX * 0.5, 1e-6);
      arrow(ctx, cx + size / 2 + 14, my, cx + size / 2 + 14, my + st.v * vScale, theme.velocity, 3);
      if (Math.abs(st.v * vScale) > 12)
        label(ctx, 'v', cx + size / 2 + 22, my + st.v * vScale * 0.5 + 4, { color: theme.velocity, bold: true, size: 14 });
    }

    if (!running && st.t === 0) {
      label(ctx, 'Körper mit Maus oder Finger ziehen', 12, H - 12, { size: 12, color: theme.muted });
    }
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- Ziehen mit Maus/Finger ----------
  let grabOffset = 0;
  function pointerDown(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const top = massTop(st.s);
    const size = massSize();
    if (Math.abs(px - vp.ox) > size / 2 + 16 || py < top - 16 || py > top + size + 16) return;
    dragging = true;
    wasRunning = running;
    loop.pause();
    grabOffset = py - top;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  }
  function pointerMove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const py = e.clientY - r.top;
    if (!dragging) {
      const top = massTop(st.s);
      const over = Math.abs(e.clientX - r.left - vp.ox) < massSize() / 2 + 8 && py > top && py < top + massSize();
      canvas.style.cursor = over ? 'grab' : '';
      return;
    }
    const s = (py - grabOffset + massSize() / 2 - vp.oy) / vp.scale;
    st.s = Math.max(-S_MAX, Math.min(S_MAX, s));
    st.v = 0;
    readout = { ...readout, s: st.s, v: 0 };
    loop.invalidate();
  }
  function pointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = '';
    messer.reset();
    ampRef = Math.max(Math.abs(st.s), 0.02);
    if (wasRunning || st.t === 0) loop.play();
  }

  // ---------- Diagramm ----------
  const plotSeries = $derived<PlotSeries[]>(
    plotQty === 's'
      ? [{ label: 'Auslenkung s', axis: 's', color: theme.object, unit: 'm' }]
      : plotQty === 'v'
        ? [{ label: 'Geschwindigkeit v', axis: 'v', color: theme.velocity, unit: 'm/s' }]
        : plotQty === 'a'
          ? [{ label: 'Beschleunigung a', axis: 'a', color: theme.acceleration, unit: 'm/s²' }]
          : [
              { label: 'Bewegungsenergie', axis: 'E', color: theme.velocity, unit: 'J' },
              { label: 'Spannenergie', axis: 'E', color: theme.object, unit: 'J' },
              { label: 'Gesamtenergie', axis: 'E', color: theme.text, unit: 'J' }
            ]
  );
  const yRange = $derived.by<[number, number]>(() => {
    const w = Math.sqrt(D / m);
    const A = ampRef * 1.15;
    if (plotQty === 's') return [-A, A];
    if (plotQty === 'v') return [-A * w, A * w];
    if (plotQty === 'a') return [-A * w * w, A * w * w];
    return [0, 0.5 * D * A * A];
  });

  function pushPlot(force = false) {
    if (!plotRef) return;
    if (plotQty === 'E') plotRef.update([buf.t, buf.ek, buf.ep, buf.eg], force);
    else plotRef.update([buf.t, buf[plotQty]], force);
  }

  $effect(() => {
    void plotQty;
    untrack(() => pushPlot(true));
  });

  // ---------- Reaktionen ----------
  $effect(() => {
    void params;
    untrack(() => {
      messer.reset();
      measurements.set('m', m);
      measurements.set('D', D);
      measurements.set('b', b);
      loop.invalidate();
    });
  });

  $effect(() => {
    void s0;
    untrack(() => {
      if (view && !running) reset();
    });
  });

  $effect(() => {
    void showForce;
    void showVelocity;
    loop.invalidate();
  });

  $effect(() => {
    loop.timeScale = speed;
  });

  onMount(() => {
    measurements.define(
      [
        { key: 'm', label: 'Masse', symbol: 'm', unit: 'kg', digits: 2 },
        { key: 'D', label: 'Federkonstante', symbol: 'D', unit: 'N/m', digits: 1 },
        { key: 'b', label: 'Dämpfung', symbol: 'b', unit: 'kg/s', digits: 2 },
        { key: 'T', label: 'Periodendauer (gemessen)', symbol: 'T', unit: 's', digits: 3 },
        { key: 'f', label: 'Frequenz (gemessen)', symbol: 'f', unit: 'Hz', digits: 3 },
        { key: 'amp', label: 'Amplitude', symbol: 'ŝ', unit: 'm', digits: 3 }
      ],
      'Federpendel'
    );
    measurements.set('m', m);
    measurements.set('D', D);
    measurements.set('b', b);
    measurements.snapshot = () => canvas.toDataURL('image/png');
    view = createCanvasView(canvas, () => {
      layout();
      loop.invalidate();
    });
    reset();
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
      loop.toggle();
    }
  }
</script>

<SimLayout>
  {#snippet stage()}
    <canvas
      bind:this={canvas}
      tabindex="0"
      aria-label="Federpendel: Körper an einer Schraubenfeder"
      onpointerdown={pointerDown}
      onpointermove={pointerMove}
      onpointerup={pointerUp}
      onpointercancel={pointerUp}
      onkeydown={onKey}
    ></canvas>
  {/snippet}

  {#snippet toolbar()}
    <PlayControls
      {running}
      bind:speed
      playLabel={readout.t > 0 ? 'Weiter' : 'Loslassen'}
      onplay={() => loop.toggle()}
      onreset={reset}
      onstep={() => loop.stepOnce()}
    />
  {/snippet}

  {#snippet readouts()}
    <Readouts
      items={[
        { symbol: 't', value: readout.t, unit: 's' },
        { symbol: 's', value: readout.s * 100, unit: 'cm', digits: 1, title: 'Auslenkung aus der Ruhelage' },
        { symbol: 'v', value: readout.v, unit: 'm/s' },
        { symbol: 'T', value: readout.T, unit: 's', digits: 3, title: 'Gemessene Periodendauer' }
      ]}
    />
  {/snippet}

  {#snippet controls()}
    <Slider label="Masse m" bind:value={m} min={0.1} max={2} step={0.05} digits={2} unit="kg" />
    <Slider label="Federkonstante D" bind:value={D} min={5} max={100} step={1} digits={0} unit="N/m" />
    <Slider label="Dämpfung b" bind:value={b} min={0} max={2} step={0.05} digits={2} unit="kg/s" />
    <Slider
      label="Startauslenkung"
      bind:value={s0}
      min={0.02}
      max={S_MAX}
      step={0.01}
      digits={2}
      unit="m"
      disabled={running}
    />
    <div class="toggles">
      <Toggle label="Geschwindigkeitspfeil" bind:checked={showVelocity} />
      <Toggle label="Kraftpfeil (rücktreibende Kraft)" bind:checked={showForce} />
    </div>
    <p class="hint muted">
      Die Periodendauer wird an den Durchgängen durch die Ruhelage gemessen (Mittel über bis zu 5 Schwingungen).
    </p>
  {/snippet}

  {#snippet plot()}
    <Segmented
      label="Größe im Diagramm"
      bind:value={plotQty}
      options={[
        { value: 's', label: 's(t)' },
        { value: 'v', label: 'v(t)' },
        { value: 'a', label: 'a(t)' },
        { value: 'E', label: 'Energien' }
      ]}
    />
    <LivePlot bind:this={plotRef} series={plotSeries} xRange={{ window: WINDOW }} {yRange} />
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
  .toggles {
    display: grid;
    gap: 2px;
  }
  .hint {
    margin: 0;
    font-size: 0.85rem;
  }
</style>
