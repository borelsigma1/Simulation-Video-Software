<!--
  Digitales Arbeitsblatt neben einer Simulation.
  Datenschutz: Eingaben leben nur im Arbeitsspeicher dieses Browser-Tabs.
  Es wird nichts gespeichert und nichts übertragen. Ergebnis = PDF-Download.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { formatMeasurement, measurements } from '../measure/bus.svelte';
  import { fitLine } from '../plot/draw';
  import Plot from '../plot/Plot.svelte';
  import type { PlotData } from '../sim/types';
  import Rich from '../ui/Rich.svelte';
  import Sym from '../ui/Sym.svelte';
  import { theme } from '../engine/theme';
  import { labelText, plainMath, tex, unitTex } from '../tex/tex';
  import {
    emptyAnswers,
    hasContent,
    isTask,
    parseNumber,
    taskNumbers,
    type ChartBlock,
    type TableBlock,
    type Worksheet
  } from './types';

  interface Props {
    worksheet: Worksheet;
    /** Lehrkraft-Ansicht: Erwartungshorizont einblenden */
    teacher?: boolean;
    /** Vorschau im Editor: keine Warnung beim Verlassen */
    preview?: boolean;
  }
  let { worksheet, teacher = false, preview = false }: Props = $props();

  let answers = $state(untrack(() => emptyAnswers(worksheet)));
  let exporting = $state(false);
  let notice = $state<{ id: string; text: string } | null>(null);
  let showSolutions = $state(true);
  const chartRefs: Record<string, ReturnType<typeof Plot> | undefined> = $state({});

  const numbers = $derived(taskNumbers(worksheet));
  const hasSolutions = $derived(worksheet.blocks.some((b) => isTask(b) && (b.solution || (b.type === 'choice' && b.correct?.length))));

  function sourceValues(b: TableBlock) {
    return b.columns.filter((c) => c.source).map((c) => ({ col: c, m: measurements.get(c.source!) }));
  }

  /** Messwerte der Simulation in die nächste freie Zeile schreiben. */
  function takeOver(b: TableBlock) {
    const vals = sourceValues(b);
    const missing = vals.filter((v) => !v.m || v.m.value === null);
    if (missing.length) {
      notice = {
        id: b.id,
        text: `Noch kein Messwert für ${missing.map((v) => plainMath(labelText(v.col.label))).join(', ')}. Lass die Simulation etwas länger laufen.`
      };
      return;
    }
    const rows = answers.tables[b.id];
    let idx = rows.findIndex((r) => b.columns.every((c, i) => !c.source || (r[i] ?? '').trim() === ''));
    if (idx === -1) {
      rows.push(b.columns.map(() => ''));
      idx = rows.length - 1;
    }
    b.columns.forEach((c, i) => {
      if (c.source) rows[idx][i] = formatMeasurement(measurements.get(c.source));
    });
    notice = { id: b.id, text: `Messwerte in Zeile ${idx + 1} übernommen.` };
  }

  function chartData(b: ChartBlock): { data: PlotData; spec: { xLabel: string; yLabel: string; series: { label: string; color: string }[] }; fit: { m: number; t: number } | null; n: number } {
    const table = worksheet.blocks.find((t): t is TableBlock => t.type === 'table' && t.id === b.table);
    const xi = table?.columns.findIndex((c) => c.key === b.x) ?? -1;
    const yi = table?.columns.findIndex((c) => c.key === b.y) ?? -1;
    const xs: number[] = [];
    const ys: number[] = [];
    if (table && xi >= 0 && yi >= 0)
      for (const r of answers.tables[table.id] ?? []) {
        const x = parseNumber(r[xi] ?? '');
        const y = parseNumber(r[yi] ?? '');
        if (Number.isFinite(x) && Number.isFinite(y)) {
          xs.push(x);
          ys.push(y);
        }
      }
    const axis = (i: number) => {
      const c = table?.columns[i];
      return c ? (c.unit ? `${plainMath(labelText(c.label))} in ${c.unit}` : plainMath(labelText(c.label))) : '?';
    };
    const fit = b.fit && answers.fits[b.id] ? fitLine(xs, ys, false) : null;
    return {
      data: { x: xs, ys: [ys], markers: true, line: fit ?? undefined },
      spec: { xLabel: axis(xi), yLabel: axis(yi), series: [{ label: 'Messwerte', color: theme.object }] },
      fit,
      n: xs.length
    };
  }

  function toggleChoice(id: string, i: number, multiple: boolean) {
    const cur = answers.choices[id];
    if (multiple) answers.choices[id] = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
    else answers.choices[id] = cur.includes(i) ? [] : [i];
  }

  async function exportPdf(withSolutions: boolean) {
    exporting = true;
    try {
      for (const b of worksheet.blocks)
        if (b.type === 'chart') answers.charts[b.id] = chartData(b).n ? (chartRefs[b.id]?.toDataURL() ?? null) : null;
      const { exportWorksheetPdf } = await import('./pdf');
      await exportWorksheetPdf(worksheet, $state.snapshot(answers), withSolutions);
    } finally {
      exporting = false;
    }
  }

  function clearAll() {
    if (confirm('Alle Eingaben auf diesem Arbeitsblatt löschen?')) answers = emptyAnswers(worksheet);
  }

  const de = (v: number) => v.toLocaleString('de-DE', { maximumSignificantDigits: 3 });

  onMount(() => {
    if (preview) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (hasContent(answers)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
</script>

{#snippet prompt(text: string)}
  <span class="prompt"><Rich {text} inline /></span>
{/snippet}

{#snippet solution(text: string | undefined)}
  {#if teacher && showSolutions && text}
    <div class="solution">
      <span class="eyebrow">Erwartungshorizont</span>
      <Rich {text} />
    </div>
  {/if}
{/snippet}

<article class="ws">
  <header>
    <p class="eyebrow">Arbeitsblatt{#if worksheet.subtitle}&ensp;·&ensp;{worksheet.subtitle}{/if}</p>
    <h2>{worksheet.title}</h2>
    <div class="who">
      <label>Name <input bind:value={answers.name} autocomplete="off" /></label>
      <label class="short">Klasse <input bind:value={answers.klasse} autocomplete="off" /></label>
      <label class="short">Datum <input bind:value={answers.datum} autocomplete="off" /></label>
    </div>
    {#if teacher && hasSolutions}
      <label class="soltoggle">
        <input type="checkbox" bind:checked={showSolutions} /> Erwartungshorizont einblenden (nur im Lehrkraft-Modus sichtbar)
      </label>
    {/if}
  </header>

  {#each worksheet.blocks as b, bi (bi)}
    {#if b.type === 'heading'}
      <h3>{b.text}</h3>
    {:else if b.type === 'text'}
      <div class="text"><Rich text={b.text} /></div>
    {:else}
      <section class="task">
        <span class="nr" aria-hidden="true">{numbers[bi]}</span>
        <div class="body">
          {#if b.type === 'question'}
            <label class="q">
              {@render prompt(b.prompt)}
              <textarea class="field" rows={b.lines ?? 3} bind:value={answers.text[b.id]}></textarea>
            </label>
          {:else if b.type === 'choice'}
            <fieldset class="q">
              <legend>{@render prompt(b.prompt)}</legend>
              {#each b.options as o, i (i)}
                <label class="opt" class:right={teacher && showSolutions && b.correct?.includes(i)}>
                  <input
                    type={b.multiple ? 'checkbox' : 'radio'}
                    name={`${b.id}-${bi}`}
                    checked={answers.choices[b.id]?.includes(i)}
                    onclick={() => toggleChoice(b.id, i, !!b.multiple)}
                  />
                  <span><Rich text={o} inline /></span>
                </label>
              {/each}
            </fieldset>
          {:else if b.type === 'table'}
            <div class="q">
              {@render prompt(b.prompt)}
              {#if sourceValues(b).length}
                <div class="take">
                  <button class="btn green" onclick={() => takeOver(b)}>
                    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v9m0 0L4.5 6.5M8 10l3.5-3.5M2 14h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                    Messwerte übernehmen
                  </button>
                  <span class="live">
                    {#each sourceValues(b) as v (v.col.key)}
                      <span>{#if v.m?.symbol}<Sym text={v.m.symbol} />{:else}<Rich text={labelText(v.col.label)} inline />{/if} = {formatMeasurement(v.m) || '–'}&nbsp;{@html tex(unitTex(v.col.unit ?? ''))}</span>
                    {/each}
                  </span>
                </div>
                {#if notice?.id === b.id}<p class="notice" role="status">{notice.text}</p>{/if}
              {/if}
              <div class="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th class="rownr">Nr.</th>
                      {#each b.columns as c (c.key)}
                        <th><Rich text={labelText(c.label)} inline />{#if c.unit}<span class="unit">&nbsp;in {@html tex(unitTex(c.unit))}</span>{/if}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each answers.tables[b.id] ?? [] as row, ri (ri)}
                      <tr>
                        <td class="rownr">{ri + 1}</td>
                        {#each b.columns as c, ci (c.key)}
                          <td class:auto={!!c.source}>
                            <input inputmode="decimal" aria-label={`${plainMath(labelText(c.label))}, Zeile ${ri + 1}`} bind:value={row[ci]} />
                          </td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              <button class="btn small ghost add" onclick={() => answers.tables[b.id].push(b.columns.map(() => ''))}>+ Zeile</button>
            </div>
          {:else if b.type === 'chart'}
            {@const c = chartData(b)}
            <div class="q">
              {@render prompt(b.prompt)}
              <div class="chart">
                <Plot bind:this={chartRefs[b.id]} spec={c.spec} data={c.data} height={250} />
                {#if c.n === 0}<p class="empty muted">Das Diagramm füllt sich, sobald die Tabelle Werte enthält.</p>{/if}
              </div>
              {#if b.fit}
                <div class="take">
                  <button class="btn small" aria-pressed={answers.fits[b.id]} onclick={() => (answers.fits[b.id] = !answers.fits[b.id])}>
                    {answers.fits[b.id] ? 'Ausgleichsgerade ausblenden' : 'Ausgleichsgerade einzeichnen'}
                  </button>
                  {#if c.fit}
                    <span class="live">Steigung {de(c.fit.m)} · Achsenabschnitt {de(c.fit.t)}</span>
                  {/if}
                </div>
              {/if}
              <textarea class="field" rows="3" bind:value={answers.text[b.id]} aria-label="Antwort zum Diagramm"></textarea>
            </div>
          {:else if b.type === 'snapshot'}
            <div class="q">
              {@render prompt(b.prompt)}
              <div class="take">
                <button
                  class="btn small"
                  onclick={() => {
                    if (measurements.snapshot) answers.snapshots[b.id] = measurements.snapshot();
                  }}>Bild der Simulation einfügen</button
                >
                {#if answers.snapshots[b.id]}
                  <button class="btn small ghost" onclick={() => (answers.snapshots[b.id] = null)}>Bild entfernen</button>
                {/if}
              </div>
              {#if answers.snapshots[b.id]}
                <img src={answers.snapshots[b.id]} alt="Momentaufnahme der Simulation" />
              {/if}
            </div>
          {/if}
          {@render solution(b.solution)}
        </div>
      </section>
    {/if}
  {/each}


  <footer>
    <button class="btn primary" onclick={() => exportPdf(false)} disabled={exporting}>
      {exporting ? 'PDF wird erstellt …' : 'Als PDF herunterladen'}
    </button>
    {#if teacher && hasSolutions}
      <button class="btn" onclick={() => exportPdf(true)} disabled={exporting}>PDF mit Erwartungshorizont</button>
    {/if}
    <button class="btn ghost" onclick={clearAll}>Eingaben löschen</button>
    <p class="privacy">
      Deine Eingaben bleiben nur in diesem Browserfenster. Es wird nichts gespeichert und nichts verschickt.
    </p>
  </footer>
</article>

<style>
  .ws {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px 22px 24px;
  }
  header {
    border-bottom: 2px solid var(--ink);
    padding-bottom: 14px;
  }
  header .eyebrow {
    margin: 0 0 4px;
  }
  h2 {
    font-size: 1.65rem;
    margin: 0;
  }
  h3 {
    font-size: 1.12rem;
    margin: 12px 0 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h3::after {
    content: '';
    flex: 1;
    border-top: 1.5px solid var(--ink);
  }
  p,
  .ws :global(p) {
    margin: 0;
  }
  .text {
    display: grid;
    gap: 8px;
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    margin-top: 12px;
  }
  .who label {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 0.8rem;
    font-family: var(--mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    flex: 2 1 180px;
  }
  .who label.short {
    flex: 1 1 110px;
  }
  .who input {
    flex: 1;
    min-width: 0;
    border: 0;
    border-bottom: 1.5px solid var(--ink-2);
    background: transparent;
    padding: 4px 2px;
    font-family: var(--font);
    font-size: 1rem;
    text-transform: none;
    letter-spacing: 0;
    color: var(--ink);
    border-radius: 0;
  }
  .soltoggle {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    font-size: 0.88rem;
    color: var(--green);
    font-weight: 600;
  }

  .task {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 4px 10px;
  }
  .nr {
    font-family: var(--display);
    font-weight: 800;
    font-size: 1.5rem;
    line-height: 1.15;
    color: var(--signal);
    text-align: right;
  }
  .body {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .q {
    display: grid;
    gap: 8px;
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 6px;
  }
  .prompt {
    font-weight: 600;
    line-height: 1.45;
  }
  .opt {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 5px 6px;
    cursor: pointer;
    border-radius: var(--radius);
  }
  .opt:hover {
    background: var(--sheet-2);
  }
  .opt.right {
    background: var(--green-soft);
    outline: 1.5px solid var(--green);
  }
  .opt input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: var(--ink);
    flex: none;
  }
  .take {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
  }
  .live {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-family: var(--mono);
    font-size: 0.82rem;
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }
  .notice {
    font-size: 0.86rem;
    color: var(--ok);
    font-weight: 600;
  }
  .tablewrap {
    overflow-x: auto;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 320px;
    background: var(--sheet);
  }
  th,
  td {
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 0;
    text-align: center;
  }
  tr > :last-child {
    border-right: 0;
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }
  th {
    background: var(--sheet-2);
    font-size: 0.92rem;
    padding: 7px 4px;
    font-weight: 600;
    border-bottom: 1.5px solid var(--ink);
  }
  th .unit {
    font-weight: 400;
    color: var(--muted);
    font-size: 0.86rem;
  }
  td input {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: center;
    font-family: var(--mono);
    font-size: 0.92rem;
    font-variant-numeric: tabular-nums;
    min-height: 38px;
    padding: 4px;
  }
  td.auto {
    background: color-mix(in srgb, var(--green-soft) 55%, transparent);
  }
  .rownr {
    width: 3em;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 0.78rem;
  }
  .add {
    justify-self: start;
  }
  .chart {
    position: relative;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 20px 60px;
    font-size: 0.9rem;
  }
  img {
    max-width: 100%;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
  }
  .solution {
    display: grid;
    gap: 4px;
    background: var(--green-soft);
    border-left: 4px solid var(--green);
    padding: 8px 12px;
    font-size: 0.93rem;
  }
  .solution .eyebrow {
    color: var(--green);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    padding-top: 16px;
    border-top: 2px solid var(--ink);
  }
  .privacy {
    flex: 1 1 100%;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
