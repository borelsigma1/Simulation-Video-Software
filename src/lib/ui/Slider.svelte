<!--
  Schieberegler, kompakt: Name und Formelzeichen links, Wert rechts (mit KaTeX
  gesetzt), darunter die Schiene. Zwei schmale Zeilen statt drei, damit alle
  Regler neben der Simulation Platz haben.
-->
<script lang="ts">
  import { quantityTex, symTex, tex } from '../tex/tex';

  interface Props {
    label: string;
    /** Formelzeichen, z. B. "v_0" */
    symbol?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    digits?: number;
    disabled?: boolean;
    onchange?: (v: number) => void;
  }

  let { label, symbol, value, min, max, step = 0.1, unit = '', digits = 1, disabled = false, onchange }: Props = $props();

  const id = `sl-${Math.random().toString(36).slice(2, 9)}`;
  const fill = $derived(max > min ? ((value - min) / (max - min)) * 100 : 0);
  const symHtml = $derived(symbol ? tex(symTex(symbol)) : '');
  const valHtml = $derived(tex(quantityTex(value, digits, unit)));
  const de = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: digits });
</script>

<div class="slider" class:disabled>
  <label for={id}>
    <span class="name">{label}{#if symHtml}<span class="symb">{@html symHtml}</span>{/if}</span>
    <output for={id}>{@html valHtml}</output>
  </label>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {disabled}
    {value}
    title={`${de(min)} bis ${de(max)}${unit ? ' ' + unit : ''}`}
    style:--fill={`${fill}%`}
    oninput={(e) => onchange?.(Number(e.currentTarget.value))}
  />
</div>

<style>
  .slider {
    display: grid;
    gap: 0;
    min-width: 0;
  }
  label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 0.86rem;
    line-height: 1.25;
  }
  .name {
    min-width: 0;
  }
  .symb {
    color: var(--muted);
    margin-left: 0.4em;
    font-size: 0.95rem;
  }
  output {
    white-space: nowrap;
    font-size: 0.98rem;
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 24px;
    margin: 0;
    background: transparent;
    touch-action: pan-y;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    background: linear-gradient(90deg, var(--signal) var(--fill), var(--sheet) var(--fill));
  }
  input[type='range']::-moz-range-track {
    height: 3px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    background: linear-gradient(90deg, var(--signal) var(--fill), var(--sheet) var(--fill));
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 20px;
    margin-top: -8.5px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    background: var(--sheet);
    box-shadow: 2px 2px 0 var(--line);
  }
  input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 18px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    background: var(--sheet);
    box-shadow: 2px 2px 0 var(--line);
  }
  .disabled {
    opacity: 0.5;
  }
  .disabled input {
    cursor: default;
  }
</style>
