<!-- Anzeige-Option als kompakter Schalter-Chip, damit mehrere in eine Zeile passen. -->
<script lang="ts">
  let { label, checked, onchange }: { label: string; checked: boolean; onchange?: (v: boolean) => void } = $props();
</script>

<label class="toggle" class:on={checked}>
  <input type="checkbox" {checked} onchange={(e) => onchange?.(e.currentTarget.checked)} />
  <span class="box" aria-hidden="true"></span>
  <span>{label}</span>
</label>

<style>
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    padding: 2px 10px 2px 7px;
    border: 1.5px solid var(--line);
    border-radius: 999px;
    background: var(--sheet);
    font-size: 0.84rem;
    line-height: 1.2;
    cursor: pointer;
    position: relative;
    user-select: none;
  }
  .toggle:hover {
    border-color: var(--ink-2);
  }
  .toggle.on {
    border-color: var(--ink);
  }
  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    margin: 0;
  }
  .box {
    flex: none;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--ink);
    border-radius: 3px;
    background: var(--sheet);
    display: grid;
    place-items: center;
  }
  input:checked + .box {
    background: var(--ink);
  }
  input:checked + .box::after {
    content: '';
    width: 8px;
    height: 4px;
    border-left: 2px solid var(--marker);
    border-bottom: 2px solid var(--marker);
    transform: rotate(-45deg) translate(1px, -1px);
  }
  input:focus-visible + .box {
    outline: 3px solid color-mix(in srgb, var(--signal) 55%, transparent);
    outline-offset: 2px;
  }
</style>
