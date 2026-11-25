<!-- Kompakte Anzeige aktueller Werte (z. B. t, x, y, v). -->
<script lang="ts">
  export interface Readout {
    symbol: string;
    value: number | null;
    unit: string;
    digits?: number;
    title?: string;
  }
  import Sym from './Sym.svelte';
  let { items }: { items: Readout[] } = $props();

  const f = (r: Readout) =>
    r.value === null || !Number.isFinite(r.value)
      ? '–'
      : (Math.abs(r.value) < 0.5 * 10 ** -(r.digits ?? 2) ? 0 : r.value).toLocaleString('de-DE', {
          minimumFractionDigits: r.digits ?? 2,
          maximumFractionDigits: r.digits ?? 2
        });
</script>

<dl class="readouts">
  {#each items as r (r.symbol)}
    <div title={r.title}>
      <dt><Sym text={r.symbol} /></dt>
      <dd>{f(r)}<span class="unit">&nbsp;{r.unit}</span></dd>
    </div>
  {/each}
</dl>

<style>
  .readouts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .readouts div {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }
  dt {
    font-style: italic;
    color: var(--muted);
  }
  dd {
    margin: 0;
    font-weight: 600;
    min-width: 4.5ch;
  }
  .unit {
    font-weight: 400;
    color: var(--muted);
  }
</style>
