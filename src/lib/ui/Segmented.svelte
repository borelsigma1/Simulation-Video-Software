<!-- Auswahl aus wenigen Optionen (z. B. welche Größe im Diagramm). -->
<script lang="ts" generics="T extends string | number">
  import Sym from './Sym.svelte';
  interface Props {
    options: { value: T; label: string }[];
    value: T;
    label: string;
    /** Beschriftungen als Formelzeichen setzen */
    math?: boolean;
    disabled?: boolean;
    onchange?: (v: T) => void;
  }
  let { options, value, label, math = false, disabled = false, onchange }: Props = $props();
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as o (o.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === o.value}
      class:active={value === o.value}
      {disabled}
      onclick={() => onchange?.(o.value)}>{#if math || o.label.includes('_')}<Sym text={o.label} />{:else}{o.label}{/if}</button
    >
  {/each}
</div>

<style>
  .seg {
    display: inline-flex;
    flex-wrap: wrap;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--sheet);
  }
  button {
    border: 0;
    border-right: 1.5px solid var(--ink);
    background: transparent;
    padding: 5px 12px;
    min-height: 34px;
    font-size: 0.9rem;
  }
  button:last-child {
    border-right: 0;
  }
  button.active {
    background: var(--ink);
    color: var(--sheet);
    font-weight: 600;
  }
  button:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
