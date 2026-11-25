<!-- Arbeitsblatt bearbeiten: Bausteine hinzufügen, ordnen, ausfüllen. -->
<script lang="ts">
  import type { SimDef } from '../sim/types';
  import { plainMath, symTex } from '../tex/tex';
  import { OPERATORS, operatorByKey, splitOperator } from '../worksheet/operators';
  import { BLOCK_NAMES, isTask, taskNumbers, type Block, type BlockType, type TableBlock, type Worksheet } from '../worksheet/types';

  let { worksheet = $bindable(), def }: { worksheet: Worksheet; def: SimDef } = $props();

  let open = $state<number | null>(null);
  const numbers = $derived(taskNumbers(worksheet));
  const tables = $derived(worksheet.blocks.filter((b): b is TableBlock => b.type === 'table'));
  const newId = () => 'a' + Math.random().toString(36).slice(2, 8);

  const sources = $derived([
    ...def.params.map((p) => ({ key: p.key, label: p.label, unit: p.unit, kind: 'Regler' })),
    ...def.measures.map((m) => ({ key: m.key, label: m.label, unit: m.unit, kind: 'Messwert' }))
  ]);

  function make(type: BlockType): Block {
    switch (type) {
      case 'heading':
        return { type, text: 'Neue Überschrift' };
      case 'text':
        return { type, text: '' };
      case 'question':
        return { type, id: newId(), operator: 'beschreiben', prompt: 'Beschreibe …', lines: 3 };
      case 'table':
        return {
          type,
          id: newId(),
          operator: 'ermitteln',
          prompt: 'Ermittle die Messwerte und trage sie in die Tabelle ein.',
          rows: 5,
          columns: [{ key: newId(), label: 'Größe', unit: '' }]
        };
      case 'choice':
        return { type, id: newId(), prompt: 'Welche Aussage trifft zu?', options: ['Aussage 1', 'Aussage 2'], correct: [] };
      case 'chart':
        return {
          type,
          id: newId(),
          operator: 'darstellen',
          prompt: 'Stelle deine Messwerte in einem Diagramm dar.',
          table: tables[0]?.id ?? '',
          x: tables[0]?.columns[0]?.key ?? '',
          y: tables[0]?.columns[1]?.key ?? '',
          fit: true
        };
      case 'snapshot':
        return { type, id: newId(), prompt: 'Füge ein Bild der Simulation ein, das deine Beobachtung zeigt.' };
    }
  }

  function add(type: BlockType, at = worksheet.blocks.length) {
    worksheet.blocks.splice(at, 0, make(type));
    open = at;
  }
  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= worksheet.blocks.length) return;
    const b = worksheet.blocks;
    [b[i], b[j]] = [b[j], b[i]];
    if (open === i) open = j;
    else if (open === j) open = i;
  }
  function remove(i: number) {
    const b = worksheet.blocks[i];
    const text = 'prompt' in b ? b.prompt : b.text;
    if (text.trim() && !confirm(`${BLOCK_NAMES[b.type]} „${text.slice(0, 60)}“ entfernen?`)) return;
    worksheet.blocks.splice(i, 1);
    open = null;
  }
  function copy(i: number) {
    const c: Block = JSON.parse(JSON.stringify(worksheet.blocks[i]));
    if (isTask(c)) c.id = newId();
    worksheet.blocks.splice(i + 1, 0, c);
    open = i + 1;
  }

  /** Operator wechseln und, wo es eindeutig ist, den Satzanfang mit austauschen. */
  function setOperator(b: Block, key: string) {
    if (!isTask(b)) return;
    const old = operatorByKey(b.operator);
    const next = operatorByKey(key);
    const [pre, word, rest] = splitOperator(b.prompt, old);
    if (!key) delete b.operator;
    else b.operator = key;
    if (!next) return;
    const simple = !next.start.includes(' ');
    if (!b.prompt.trim() || b.prompt.trim() === (old?.start ?? '') + ' …') b.prompt = simple ? `${next.start} …` : `${next.start}.`;
    else if (word && simple && !old!.start.includes(' ')) b.prompt = pre + next.start + rest;
  }

  const title = (b: Block) => ('prompt' in b ? b.prompt : b.text) || '(leer)';
  const types = Object.keys(BLOCK_NAMES) as BlockType[];

  function setSource(c: TableBlock['columns'][number], key: string) {
    if (!key) {
      delete c.source;
      return;
    }
    c.source = key;
    const s = sources.find((x) => x.key === key);
    const p = def.params.find((x) => x.key === key);
    const m = def.measures.find((x) => x.key === key);
    if (s && (!c.label.trim() || c.label === 'Größe')) {
      const sym = p?.symbol ?? m?.symbol;
      c.label = sym ? `$${symTex(sym)}$` : s.label;
      c.unit = s.unit;
    }
  }
</script>

<div class="group">
  <div class="grid g2">
    <label>Titel des Arbeitsblatts <input class="field" bind:value={worksheet.title} /></label>
    <label>Untertitel <input class="field" bind:value={worksheet.subtitle} placeholder="z. B. Optik · Jahrgangsstufe 8" /></label>
  </div>
</div>

{#each worksheet.blocks as b, i (i)}
  <div class="block" class:open={open === i} class:task={isTask(b)}>
    <div class="head">
      <button class="toggle" onclick={() => (open = open === i ? null : i)} aria-expanded={open === i}>
        <span class="kind">{numbers[i] ? `${numbers[i]} · ` : ''}{BLOCK_NAMES[b.type]}</span>
        <span class="title">{title(b)}</span>
      </button>
      <button class="icon" title="nach oben" disabled={i === 0} onclick={() => move(i, -1)}>↑</button>
      <button class="icon" title="nach unten" disabled={i === worksheet.blocks.length - 1} onclick={() => move(i, 1)}>↓</button>
      <button class="icon" title="duplizieren" onclick={() => copy(i)}>⧉</button>
      <button class="icon del" title="entfernen" onclick={() => remove(i)}>✕</button>
    </div>

    {#if open === i}
      <div class="bodyform">
        {#if b.type === 'heading'}
          <label>Überschrift <input class="field" bind:value={b.text} /></label>
        {:else if b.type === 'text'}
          <label>
            Text
            <textarea class="field" rows="5" bind:value={b.text}></textarea>
          </label>
          <p class="hint">Leerzeile = neuer Absatz. **fett** hebt hervor.</p>
        {:else}
          {@const op = operatorByKey(b.operator)}
          <div class="grid opgrid">
            <label>
              Operator
              <select class="field" value={b.operator ?? ''} onchange={(e) => setOperator(b, e.currentTarget.value)}>
                <option value="">ohne</option>
                {#each ['I', 'II', 'III'] as afb (afb)}
                  <optgroup label={`überwiegend Anforderungsbereich ${afb}`}>
                    {#each OPERATORS.filter((o) => o.afb === afb) as o (o.key)}<option value={o.key}>{o.name}</option>{/each}
                  </optgroup>
                {/each}
              </select>
            </label>
            <label>
              Aufgabenstellung
              <textarea class="field" rows="2" bind:value={b.prompt}></textarea>
            </label>
          </div>
          {#if op}
            <p class="hint">
              <b>{op.name}:</b>
              {op.meaning}
              {#if !splitOperator(b.prompt, op)[1]}
                <span class="warn">In der Aufgabe kommt „{op.start.split(' ')[0]}“ nicht vor; der Operator wird dann nicht markiert.</span>
              {/if}
            </p>
          {/if}

          {#if b.type === 'question'}
            <label class="narrow">Zeilen für die Antwort <input class="field" type="number" min="1" max="20" bind:value={b.lines} /></label>
          {:else if b.type === 'table'}
            <div class="cols">
              <span class="lbl">Spalten</span>
              {#each b.columns as c, ci (c.key)}
                <div class="colrow">
                  <input class="field" bind:value={c.label} placeholder="z. B. $T^2$ oder Masse" aria-label="Beschriftung" />
                  <input class="field unit" bind:value={c.unit} placeholder="Einheit" aria-label="Einheit" />
                  <select class="field" value={c.source ?? ''} onchange={(e) => setSource(c, e.currentTarget.value)} aria-label="Herkunft der Werte">
                    <option value="">von Hand ausfüllen</option>
                    {#each ['Regler', 'Messwert'] as kind (kind)}
                      <optgroup label={`aus der Simulation: ${kind}`}>
                        {#each sources.filter((s) => s.kind === kind) as s (s.key)}
                          <option value={s.key}>{s.label}{s.unit ? ` (${s.unit})` : ''}</option>
                        {/each}
                      </optgroup>
                    {/each}
                  </select>
                  <button class="icon" title="nach links" disabled={ci === 0} onclick={() => ([b.columns[ci - 1], b.columns[ci]] = [b.columns[ci], b.columns[ci - 1]])}>←</button>
                  <button class="icon del" title="Spalte entfernen" disabled={b.columns.length < 2} onclick={() => b.columns.splice(ci, 1)}>✕</button>
                </div>
              {/each}
              <div class="rowline">
                <button class="btn small ghost" onclick={() => b.columns.push({ key: newId(), label: '', unit: '' })}>+ Spalte</button>
                <label class="narrow inline">Zeilen <input class="field" type="number" min="1" max="30" bind:value={b.rows} /></label>
              </div>
              <p class="hint">Spalten „aus der Simulation“ füllt die Schaltfläche „Messwerte übernehmen“. Formelzeichen mit Index: T_1.</p>
            </div>
          {:else if b.type === 'choice'}
            <div class="cols">
              <span class="lbl">Antwortmöglichkeiten (Haken = richtig, nur im Erwartungshorizont sichtbar)</span>
              {#each b.options as _, oi (oi)}
                <div class="colrow">
                  <input
                    type="checkbox"
                    class="ok"
                    title="richtige Antwort"
                    checked={b.correct?.includes(oi)}
                    onchange={(e) => {
                      const set = new Set(b.correct ?? []);
                      if (e.currentTarget.checked) set.add(oi);
                      else set.delete(oi);
                      b.correct = [...set].sort();
                    }}
                  />
                  <input class="field" bind:value={b.options[oi]} aria-label={`Antwort ${oi + 1}`} />
                  <button
                    class="icon del"
                    title="entfernen"
                    disabled={b.options.length < 3}
                    onclick={() => {
                      b.options.splice(oi, 1);
                      b.correct = (b.correct ?? []).filter((x) => x !== oi).map((x) => (x > oi ? x - 1 : x));
                    }}>✕</button
                  >
                </div>
              {/each}
              <div class="rowline">
                <button class="btn small ghost" onclick={() => b.options.push('')}>+ Antwort</button>
                <label class="check"><input type="checkbox" bind:checked={b.multiple} /> mehrere Antworten ankreuzbar</label>
              </div>
            </div>
          {:else if b.type === 'chart'}
            {@const t = tables.find((x) => x.id === b.table)}
            {#if !tables.length}
              <p class="hint warn">Eine Diagrammaufgabe braucht eine Wertetabelle auf demselben Arbeitsblatt. Lege zuerst eine an.</p>
            {:else}
              <div class="grid g3">
                <label>
                  Werte aus Tabelle
                  <select
                    class="field"
                    value={b.table}
                    onchange={(e) => {
                      b.table = e.currentTarget.value;
                      const nt = tables.find((x) => x.id === b.table);
                      b.x = nt?.columns[0]?.key ?? '';
                      b.y = nt?.columns[1]?.key ?? b.x;
                    }}
                  >
                    {#each tables as tb (tb.id)}
                      <option value={tb.id}>Aufgabe {numbers[worksheet.blocks.indexOf(tb)]}: {tb.columns.map((c) => plainMath(c.label)).join(', ')}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  Rechtsachse
                  <select class="field" bind:value={b.x}>
                    {#each t?.columns ?? [] as c (c.key)}<option value={c.key}>{plainMath(c.label) || '(ohne Namen)'}</option>{/each}
                  </select>
                </label>
                <label>
                  Hochachse
                  <select class="field" bind:value={b.y}>
                    {#each t?.columns ?? [] as c (c.key)}<option value={c.key}>{plainMath(c.label) || '(ohne Namen)'}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="check"><input type="checkbox" bind:checked={b.fit} /> Ausgleichsgerade darf eingezeichnet werden</label>
            {/if}
          {/if}

          <label>
            Erwartungshorizont (nur für dich sichtbar)
            <textarea class="field sol" rows="2" bind:value={b.solution}></textarea>
          </label>
        {/if}
      </div>
    {/if}
  </div>
{/each}

<div class="group addbar">
  <span class="lbl">Baustein hinzufügen</span>
  <div class="rowline">
    {#each types as t (t)}
      <button class="btn small" onclick={() => add(t)}>+ {BLOCK_NAMES[t]}</button>
    {/each}
  </div>
</div>

<style>
  .block {
    border: 1.5px solid var(--line);
    border-radius: var(--radius);
    background: var(--sheet);
  }
  .block.task {
    border-left: 5px solid var(--signal);
  }
  .block.open {
    border-color: var(--ink);
    border-left-color: var(--signal);
    box-shadow: var(--stack);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px 5px 0;
  }
  .toggle {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 1px;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 5px 10px;
  }
  .kind {
    font-family: var(--mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .title {
    font-weight: 600;
    font-size: 0.93rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bodyform {
    display: grid;
    gap: 10px;
    padding: 10px 12px 14px;
    border-top: 1px dashed var(--line);
  }
  .opgrid {
    grid-template-columns: minmax(130px, 190px) minmax(0, 1fr);
  }
  .warn {
    color: var(--warn);
    font-weight: 600;
  }
  .narrow {
    max-width: 180px;
  }
  .inline {
    display: flex !important;
    align-items: center;
    gap: 8px !important;
  }
  .inline input {
    width: 80px;
  }
  .cols {
    display: grid;
    gap: 6px;
  }
  .colrow {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .colrow .field {
    flex: 2 1 0;
    min-width: 0;
  }
  .colrow .unit {
    flex: 1 1 0;
  }
  .ok {
    width: 20px;
    height: 20px;
    accent-color: var(--green);
    flex: none;
  }
  .sol {
    background: var(--green-soft);
    border-color: color-mix(in srgb, var(--green) 40%, var(--line));
  }
  .addbar {
    border-style: dashed;
  }
  @media (max-width: 560px) {
    .opgrid {
      grid-template-columns: 1fr;
    }
    .colrow {
      flex-wrap: wrap;
    }
  }
</style>
