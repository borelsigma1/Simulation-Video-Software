<!-- Schieberegler mit Skala. Der Wert steht rechts wie auf einem Messgerät. -->
<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    digits?: number;
    disabled?: boolean;
    onchange?: (v: number) => void;
  }

  let { label, value, min, max, step = 0.1, unit = '', digits = 1, disabled = false, onchange }: Props = $props();

  const id = `sl-${Math.random().toString(36).slice(2, 9)}`;
  const de = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const fill = $derived(max > min ? ((value - min) / (max - min)) * 100 : 0);
</script>

<div class="slider" class:disabled>
  <label for={id}>
    <span class="name">{label}</span>
    <output for={id}>{de(value)}{#if unit}<span class="unit">&nbsp;{unit}</span>{/if}</output>
  </label>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {disabled}
    {value}
    style:--fill={`${fill}%`}
    oninput={(e) => onchange?.(Number(e.currentTarget.value))}
  />
  <div class="scale" aria-hidden="true"><span>{de(min)}</span><span>{de(max)}</span></div>
</div>

<style>
  .slider {
    display: grid;
    gap: 0;
  }
  label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 0.93rem;
  }
  output {
    font-family: var(--mono);
    font-size: 0.9rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .unit {
    font-weight: 400;
    color: var(--muted);
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 30px;
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
    height: 24px;
    margin-top: -10.5px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    background: var(--sheet);
    box-shadow: 2px 2px 0 var(--line);
  }
  input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 22px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    background: var(--sheet);
    box-shadow: 2px 2px 0 var(--line);
  }
  .scale {
    display: flex;
    justify-content: space-between;
    font-family: var(--mono);
    font-size: 0.66rem;
    color: var(--muted);
    margin-top: -4px;
  }
  .disabled {
    opacity: 0.5;
  }
  .disabled input {
    cursor: default;
  }
</style>
