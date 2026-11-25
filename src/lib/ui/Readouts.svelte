<!-- Messanzeige: aktuelle Werte wie auf einem Messgerät, Zahlen und Einheiten mit KaTeX. -->
<script lang="ts">
  import { quantityTex, symTex, tex } from '../tex/tex';
  export interface Readout {
    symbol: string;
    value: number | null;
    unit: string;
    digits?: number;
    title?: string;
  }
  let { items }: { items: Readout[] } = $props();
</script>

<dl class="readouts">
  {#each items as r (r.symbol + r.unit)}
    <div title={r.title}>
      <dt>{@html tex(symTex(r.symbol))}</dt>
      <dd>{@html tex(quantityTex(r.value, r.digits ?? 2, r.unit))}</dd>
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
    gap: 8px;
    align-items: baseline;
    padding: 4px 11px;
    border-right: 1px solid color-mix(in srgb, var(--chalk) 22%, transparent);
    flex: 1 0 auto;
  }
  .readouts div:last-child {
    border-right: 0;
  }
  dt {
    color: var(--marker);
    font-size: 1.02rem;
  }
  dd {
    margin: 0;
    font-size: 1rem;
    min-width: 5ch;
    text-align: right;
    flex: 1;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
</style>
