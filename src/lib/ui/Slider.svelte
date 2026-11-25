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

  let {
    label,
    value = $bindable(),
    min,
    max,
    step = 0.1,
    unit = '',
    digits = 1,
    disabled = false,
    onchange
  }: Props = $props();

  const id = `sl-${Math.random().toString(36).slice(2, 9)}`;
  const shown = $derived(
    value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  );
</script>

<div class="slider" class:disabled>
  <label for={id}>
    <span class="name">{label}</span>
    <output for={id}>{shown}&nbsp;{unit}</output>
  </label>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {disabled}
    bind:value
    oninput={() => onchange?.(value)}
  />
</div>

<style>
  .slider {
    display: grid;
    gap: 2px;
  }
  label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.92rem;
  }
  output {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  input[type='range'] {
    width: 100%;
    height: 32px;
    accent-color: var(--accent);
    touch-action: pan-y;
  }
  .disabled {
    opacity: 0.55;
  }
</style>
