<!-- Auswahl aus wenigen Optionen (z. B. welche Größe im Diagramm). -->
<script lang="ts" generics="T extends string">
  interface Props {
    options: { value: T; label: string }[];
    value: T;
    label: string;
  }
  let { options, value = $bindable(), label }: Props = $props();
  import Sym from './Sym.svelte';
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as o (o.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === o.value}
      class:active={value === o.value}
      onclick={() => (value = o.value)}><Sym text={o.label} /></button
    >
  {/each}
</div>

<style>
  .seg {
    display: inline-flex;
    flex-wrap: wrap;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: 6px;
  }
  button {
    border: 0;
    border-right: 1px solid var(--border);
    background: var(--surface);
    padding: 6px 12px;
    min-height: 36px;
    font-size: 0.9rem;
  }
  button:last-child {
    border-right: 0;
  }
  button.active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
</style>
