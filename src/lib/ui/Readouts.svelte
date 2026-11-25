<!-- Messanzeige: aktuelle Werte wie auf einem Messgerät. -->
<script lang="ts">
  import Sym from './Sym.svelte';
  export interface Readout {
    symbol: string;
    value: number | null;
    unit: string;
    digits?: number;
    title?: string;
  }
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
  {#each items as r (r.symbol + r.unit)}
    <div title={r.title}>
      <dt><Sym text={r.symbol} /></dt>
      <dd>{f(r)}<span class="unit">{r.unit ? ` ${r.unit}` : ''}</span></dd>
    </div>
  {/each}
</dl>

<style>
  .readouts {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    margin: 0;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    background: var(--board);
    color: var(--chalk);
    overflow: hidden;
  }
  .readouts div {
    display: flex;
    gap: 7px;
    align-items: baseline;
    padding: 5px 11px;
    border-right: 1px solid color-mix(in srgb, var(--chalk) 22%, transparent);
    flex: 1 0 auto;
  }
  .readouts div:last-child {
    border-right: 0;
  }
  dt {
    color: var(--marker);
  }
  dd {
    margin: 0;
    font-family: var(--mono);
    font-size: 0.9rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    min-width: 4ch;
    text-align: right;
    flex: 1;
    white-space: nowrap;
  }
  .unit {
    font-weight: 400;
    opacity: 0.7;
  }
</style>
