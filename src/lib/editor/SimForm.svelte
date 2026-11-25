<!--
  Simulation einer Lerneinheit anpassen: Regler (sichtbar, gesperrt,
  Beschriftung, Bereich, Schritt, Startwert), Anzeigen, Diagramme,
  Voreinstellungen. Die Physik selbst ist hier bewusst nicht änderbar.
-->
<script lang="ts">
  import type { OptionOverride, ParamOverride, SimConfig, SimDef } from '../sim/types';

  let { sim = $bindable(), def }: { sim: SimConfig; def: SimDef } = $props();

  const po = (key: string): ParamOverride => sim.params?.[key] ?? {};
  const oo = (key: string): OptionOverride => sim.options?.[key] ?? {};

  function setP<K extends keyof ParamOverride>(key: string, field: K, value: ParamOverride[K] | undefined) {
    const all = (sim.params ??= {});
    const o = (all[key] ??= {});
    if (value === undefined || value === false || value === '' || (typeof value === 'number' && !Number.isFinite(value))) delete o[field];
    else o[field] = value;
    if (!Object.keys(o).length) delete all[key];
    if (!Object.keys(all).length) delete sim.params;
  }
  function setO<K extends keyof OptionOverride>(key: string, field: K, value: OptionOverride[K] | undefined) {
    const all = (sim.options ??= {});
    const o = (all[key] ??= {});
    if (value === undefined) delete o[field];
    else o[field] = value;
    if (!Object.keys(o).length) delete all[key];
    if (!Object.keys(all).length) delete sim.options;
  }
  const num = (e: Event) => {
    const v = (e.currentTarget as HTMLInputElement).value.trim().replace(',', '.');
    return v === '' ? undefined : Number(v);
  };

  function togglePlot(key: string, visible: boolean) {
    const hidden = new Set(sim.hiddenPlots ?? []);
    if (visible) hidden.delete(key);
    else hidden.add(key);
    if (hidden.size) sim.hiddenPlots = [...hidden];
    else delete sim.hiddenPlots;
  }

  const sliders = $derived(def.params.filter((p) => !p.choices));
  function customizePresets() {
    sim.presets = JSON.parse(JSON.stringify(def.presets ?? []));
  }
  function addPreset() {
    (sim.presets ??= []).push({ name: 'Neue Voreinstellung', values: {} });
  }
  function addValue(i: number) {
    const pr = sim.presets![i];
    const free = def.params.find((p) => !(p.key in pr.values));
    if (free) pr.values[free.key] = free.value;
  }
  function renameValue(i: number, from: string, to: string) {
    const pr = sim.presets![i];
    const v = pr.values[from];
    delete pr.values[from];
    pr.values[to] = def.params.find((p) => p.key === to)?.value ?? v;
  }
</script>

<div class="group">
  <h3>{def.title}</h3>
  <p class="hint">{def.summary} Physik und Zeichnung dieser Simulation sind fest programmiert; hier legst du fest, was die Klasse einstellen und sehen kann.</p>
</div>

<div class="group">
  <h3>Regler</h3>
  <p class="hint">Leere Felder übernehmen den Standard der Simulation (grau angezeigt).</p>
  {#each def.params as p (p.key)}
    {@const o = po(p.key)}
    <div class="param" class:off={o.hidden}>
      <div class="rowline">
        <b>{p.label}</b>
        {#if p.unit}<span class="hint">in {p.unit}</span>{/if}
        <span style:flex="1"></span>
        <label class="check"><input type="checkbox" checked={!o.hidden} onchange={(e) => setP(p.key, 'hidden', !e.currentTarget.checked)} /> sichtbar</label>
        <label class="check"><input type="checkbox" checked={!!o.locked} onchange={(e) => setP(p.key, 'locked', e.currentTarget.checked)} /> gesperrt</label>
      </div>
      <div class="grid" class:g4={!p.choices} class:g2={!!p.choices}>
        <label style:grid-column={p.choices ? 'auto' : '1 / -1'}>
          Beschriftung
          <input class="field" value={o.label ?? ''} placeholder={p.label} oninput={(e) => setP(p.key, 'label', e.currentTarget.value)} />
        </label>
        {#if p.choices}
          <label>
            Startwert
            <select class="field" value={o.value ?? p.value} onchange={(e) => setP(p.key, 'value', Number(e.currentTarget.value) === p.value ? undefined : Number(e.currentTarget.value))}>
              {#each p.choices as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
            </select>
          </label>
        {:else}
          <label>von <input class="field" inputmode="decimal" value={o.min ?? ''} placeholder={String(p.min)} onchange={(e) => setP(p.key, 'min', num(e))} /></label>
          <label>bis <input class="field" inputmode="decimal" value={o.max ?? ''} placeholder={String(p.max)} onchange={(e) => setP(p.key, 'max', num(e))} /></label>
          <label>Schritt <input class="field" inputmode="decimal" value={o.step ?? ''} placeholder={String(p.step)} onchange={(e) => setP(p.key, 'step', num(e))} /></label>
          <label>Startwert <input class="field" inputmode="decimal" value={o.value ?? ''} placeholder={String(p.value)} onchange={(e) => setP(p.key, 'value', num(e))} /></label>
        {/if}
      </div>
      {#if !p.choices}
        <p class="hint">Möglicher Bereich: {p.min} bis {p.max} {p.unit}</p>
      {/if}
    </div>
  {/each}
</div>

{#if def.options.length}
  <div class="group">
    <h3>Anzeigen (Pfeile, Hilfslinien …)</h3>
    {#each def.options as op (op.key)}
      {@const o = oo(op.key)}
      <div class="rowline optrow">
        <span class="name">{op.label}</span>
        <label class="check"><input type="checkbox" checked={!o.hidden} onchange={(e) => setO(op.key, 'hidden', e.currentTarget.checked ? undefined : true)} /> Schalter sichtbar</label>
        <label class="check">
          <input
            type="checkbox"
            checked={o.value ?? op.value}
            onchange={(e) => setO(op.key, 'value', e.currentTarget.checked === op.value ? undefined : e.currentTarget.checked)}
          /> anfangs eingeschaltet
        </label>
      </div>
    {/each}
  </div>
{/if}

{#if def.plots.length}
  <div class="group">
    <h3>Diagramme</h3>
    <div class="rowline">
      {#each def.plots as pl (pl.key)}
        <label class="check">
          <input type="checkbox" checked={!sim.hiddenPlots?.includes(pl.key)} onchange={(e) => togglePlot(pl.key, e.currentTarget.checked)} />
          {pl.label}
        </label>
      {/each}
    </div>
  </div>
{/if}

<div class="group">
  <h3>Voreinstellungen</h3>
  <p class="hint">Knöpfe, die mehrere Regler auf einmal setzen, z. B. „Mond“ für g = 1,62.</p>
  {#if !sim.presets}
    <div class="rowline">
      {#each def.presets ?? [] as pr (pr.name)}<span class="pill">{pr.name}</span>{:else}<span class="hint">Die Simulation bringt keine Voreinstellungen mit.</span>{/each}
    </div>
    <div class="rowline">
      <button class="btn small" onclick={customizePresets}>{def.presets?.length ? 'Voreinstellungen anpassen' : 'Eigene Voreinstellungen anlegen'}</button>
    </div>
  {:else}
    {#each sim.presets as pr, i (i)}
      <div class="preset">
        <div class="rowline">
          <label style:flex="1">Name <input class="field" bind:value={pr.name} /></label>
          <button class="icon del" title="Voreinstellung löschen" onclick={() => sim.presets!.splice(i, 1)}>✕</button>
        </div>
        {#each Object.keys(pr.values) as k (k)}
          {@const pd = def.params.find((x) => x.key === k)}
          <div class="rowline">
            <select class="field val" value={k} onchange={(e) => renameValue(i, k, e.currentTarget.value)}>
              {#each def.params as x (x.key)}
                <option value={x.key} disabled={x.key !== k && x.key in pr.values}>{x.label}</option>
              {/each}
            </select>
            {#if pd?.choices}
              <select class="field val" value={pr.values[k]} onchange={(e) => (pr.values[k] = Number(e.currentTarget.value))}>
                {#each pd.choices as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
              </select>
            {:else}
              <input class="field val" inputmode="decimal" value={pr.values[k]} onchange={(e) => (pr.values[k] = num(e) ?? pd?.value ?? 0)} />
              <span class="hint">{pd?.unit}</span>
            {/if}
            <button class="icon del" title="Wert entfernen" onclick={() => delete pr.values[k]}>✕</button>
          </div>
        {/each}
        {#if Object.keys(pr.values).length < def.params.length}
          <div><button class="btn small ghost" onclick={() => addValue(i)}>+ Reglerwert</button></div>
        {/if}
      </div>
    {/each}
    <div class="rowline">
      <button class="btn small" onclick={addPreset}>+ Voreinstellung</button>
      <button class="btn small ghost" onclick={() => delete sim.presets}>Standard der Simulation wiederherstellen</button>
    </div>
  {/if}
</div>

<style>
  .param {
    display: grid;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px dashed var(--line);
  }
  .param.off .grid,
  .param.off > .hint {
    opacity: 0.4;
  }
  .optrow {
    padding: 6px 0;
    border-top: 1px dashed var(--line);
  }
  .optrow .name {
    flex: 1 1 200px;
    font-weight: 600;
    font-size: 0.93rem;
  }
  .pill {
    border: 1.5px solid var(--ink);
    border-radius: 999px;
    padding: 2px 11px;
    font-size: 0.86rem;
    font-weight: 600;
  }
  .preset {
    display: grid;
    gap: 8px;
    padding: 10px;
    background: var(--sheet-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .val {
    width: auto;
    flex: 1 1 120px;
  }
</style>
