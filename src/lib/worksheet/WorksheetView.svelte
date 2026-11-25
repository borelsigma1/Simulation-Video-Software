<!--
  Digitales Arbeitsblatt neben einer Simulation.
  Datenschutz: Eingaben leben nur im Arbeitsspeicher dieses Browser-Tabs.
  Es wird nichts gespeichert und nichts übertragen. Ergebnis = PDF-Download.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { formatMeasurement, measurements } from '../measure/bus.svelte';
  import { paragraphs } from './richtext';
  import Sym from '../ui/Sym.svelte';
  import { emptyAnswers, hasContent, type TableBlock, type Worksheet } from './types';

  let { worksheet }: { worksheet: Worksheet } = $props();

  // svelte-ignore state_referenced_locally
  let answers = $state(emptyAnswers(worksheet));
  let exporting = $state(false);
  let notice = $state<{ id: string; text: string } | null>(null);

  function sourceValues(b: TableBlock) {
    return b.columns
      .filter((c) => c.source)
      .map((c) => ({ col: c, m: measurements.get(c.source!) }));
  }

  /** Messwerte der Simulation in die nächste freie Zeile schreiben. */
  function takeOver(b: TableBlock) {
    const vals = sourceValues(b);
    const missing = vals.filter((v) => !v.m || v.m.value === null);
    if (missing.length) {
      notice = {
        id: b.id,
        text: `Noch kein Messwert für ${missing.map((v) => v.col.label).join(', ')}. Lass die Simulation etwas länger laufen.`
      };
      return;
    }
    const rows = answers.tables[b.id];
    let idx = rows.findIndex((r) => b.columns.every((c, i) => !c.source || r[i].trim() === ''));
    if (idx === -1) {
      rows.push(b.columns.map(() => ''));
      idx = rows.length - 1;
    }
    b.columns.forEach((c, i) => {
      if (c.source) rows[idx][i] = formatMeasurement(measurements.get(c.source));
    });
    notice = { id: b.id, text: `Messwerte in Zeile ${idx + 1} übernommen.` };
  }

  function addRow(b: TableBlock) {
    answers.tables[b.id].push(b.columns.map(() => ''));
  }

  function takeSnapshot(id: string) {
    const snap = measurements.snapshot;
    if (snap) answers.snapshots[id] = snap();
  }

  function toggleChoice(id: string, i: number, multiple: boolean) {
    const cur = answers.choices[id];
    if (multiple) answers.choices[id] = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
    else answers.choices[id] = [i];
  }

  async function exportPdf() {
    exporting = true;
    try {
      const { exportWorksheetPdf } = await import('./pdf');
      await exportWorksheetPdf(worksheet, $state.snapshot(answers));
    } finally {
      exporting = false;
    }
  }

  function clearAll() {
    if (confirm('Alle Eingaben auf diesem Arbeitsblatt löschen?')) answers = emptyAnswers(worksheet);
  }

  onMount(() => {
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

<article class="ws">
  <header>
    <h2>{worksheet.title}</h2>
    {#if worksheet.subtitle}<p class="muted sub">{worksheet.subtitle}</p>{/if}
    <div class="who">
      <label>Name <input bind:value={answers.name} autocomplete="off" /></label>
      <label class="short">Klasse <input bind:value={answers.klasse} autocomplete="off" /></label>
      <label class="short">Datum <input bind:value={answers.datum} autocomplete="off" /></label>
    </div>
    <p class="privacy">
      Deine Eingaben bleiben nur in diesem Browserfenster und werden nicht gespeichert oder verschickt.
      Lade am Ende das PDF herunter.
    </p>
  </header>

  {#each worksheet.blocks as b, bi (bi)}
    {#if b.type === 'heading'}
      <h3>{b.text}</h3>
    {:else if b.type === 'text'}
      {#each paragraphs(b.text) as p, pi (pi)}
        <p>
          {#each p as s, si (si)}{#if s.bold}<strong>{s.text}</strong>{:else}{s.text}{/if}{/each}
        </p>
      {/each}
    {:else if b.type === 'question'}
      <label class="q">
        <span class="prompt">{b.prompt}</span>
        <textarea rows={b.lines ?? 3} bind:value={answers.text[b.id]}></textarea>
      </label>
    {:else if b.type === 'choice'}
      <fieldset class="q">
        <legend class="prompt">{b.prompt}</legend>
        {#each b.options as o, i (i)}
          <label class="opt">
            <input
              type={b.multiple ? 'checkbox' : 'radio'}
              name={b.id}
              checked={answers.choices[b.id].includes(i)}
              onchange={() => toggleChoice(b.id, i, !!b.multiple)}
            />
            <span>{o}</span>
          </label>
        {/each}
      </fieldset>
    {:else if b.type === 'table'}
      <div class="q">
        {#if b.prompt}<span class="prompt">{b.prompt}</span>{/if}
        {#if sourceValues(b).length}
          <div class="take">
            <button class="btn primary" onclick={() => takeOver(b)}>Messwerte übernehmen</button>
            <span class="live muted">
              {#each sourceValues(b) as v (v.col.key)}
                <span><Sym text={v.m?.symbol ?? v.col.label} /> = {formatMeasurement(v.m) || '–'} {v.col.unit ?? ''}</span>
              {/each}
            </span>
          </div>
          {#if notice?.id === b.id}<p class="notice" role="status">{notice.text}</p>{/if}
        {/if}
        <div class="tablewrap">
          <table>
            <thead>
              <tr>
                <th class="nr">Nr.</th>
                {#each b.columns as c (c.key)}
                  <th>{c.label}{#if c.unit}<span class="unit"> in {c.unit}</span>{/if}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each answers.tables[b.id] as row, ri (ri)}
                <tr>
                  <td class="nr">{ri + 1}</td>
                  {#each b.columns as c, ci (c.key)}
                    <td>
                      <input
                        inputmode="decimal"
                        aria-label={`${c.label}, Zeile ${ri + 1}`}
                        class:auto={!!c.source}
                        bind:value={row[ci]}
                      />
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <button class="btn small" onclick={() => addRow(b)}>+ Zeile</button>
      </div>
    {:else if b.type === 'snapshot'}
      <div class="q">
        <span class="prompt">{b.prompt}</span>
        <div class="take">
          <button class="btn" onclick={() => takeSnapshot(b.id)}>Bild der Simulation einfügen</button>
          {#if answers.snapshots[b.id]}
            <button class="btn" onclick={() => (answers.snapshots[b.id] = null)}>Bild entfernen</button>
          {/if}
        </div>
        {#if answers.snapshots[b.id]}
          <img src={answers.snapshots[b.id]} alt="Momentaufnahme der Simulation" />
        {/if}
      </div>
    {/if}
  {/each}

  <footer>
    <button class="btn primary" onclick={exportPdf} disabled={exporting}>
      {exporting ? 'PDF wird erstellt …' : 'Als PDF herunterladen'}
    </button>
    <button class="btn" onclick={clearAll}>Eingaben löschen</button>
  </footer>
</article>

<style>
  .ws {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 20px 22px;
  }
  h2 {
    font-size: 1.3rem;
    margin: 0;
  }
  h3 {
    font-size: 1.05rem;
    margin: 10px 0 0;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  p {
    margin: 0;
  }
  .sub {
    margin-top: 2px;
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
  }
  .who label {
    display: grid;
    gap: 2px;
    font-size: 0.85rem;
    color: var(--muted);
    flex: 2 1 160px;
  }
  .who label.short {
    flex: 1 1 90px;
  }
  input:not([type]),
  input[inputmode],
  textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    background: var(--surface);
    color: var(--text);
    font-size: 1rem;
  }
  textarea {
    resize: vertical;
    line-height: 1.45;
  }
  .privacy {
    margin-top: 10px;
    font-size: 0.82rem;
    color: var(--muted);
    background: var(--surface-2);
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
  }
  .q {
    display: grid;
    gap: 6px;
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .prompt {
    font-weight: 600;
  }
  legend.prompt {
    margin-bottom: 4px;
  }
  .opt {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 4px 0;
    cursor: pointer;
  }
  .opt input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: var(--accent);
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
    gap: 4px 12px;
    font-size: 0.88rem;
    font-variant-numeric: tabular-nums;
  }
  .notice {
    font-size: 0.85rem;
    color: var(--ok);
  }
  .tablewrap {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 320px;
  }
  th,
  td {
    border: 1px solid var(--border);
    padding: 0;
    text-align: center;
  }
  th {
    background: var(--surface-2);
    font-size: 0.88rem;
    padding: 6px 4px;
    font-weight: 600;
  }
  th .unit {
    font-weight: 400;
    color: var(--muted);
  }
  td input {
    border: 0 !important;
    border-radius: 0 !important;
    text-align: center;
    font-variant-numeric: tabular-nums;
    min-height: 38px;
  }
  td input.auto {
    background: #fbfcfe;
  }
  .nr {
    width: 3em;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .btn.small {
    justify-self: start;
    min-height: 34px;
    font-size: 0.88rem;
  }
  img {
    max-width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
</style>
