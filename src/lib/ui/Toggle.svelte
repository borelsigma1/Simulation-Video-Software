<script lang="ts">
  let { label, checked, onchange }: { label: string; checked: boolean; onchange?: (v: boolean) => void } = $props();
</script>

<label class="toggle">
  <input type="checkbox" {checked} onchange={(e) => onchange?.(e.currentTarget.checked)} />
  <span class="box" aria-hidden="true"></span>
  <span>{label}</span>
</label>

<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 32px;
    font-size: 0.93rem;
    cursor: pointer;
    position: relative;
  }
  input {
    position: absolute;
    opacity: 0;
    width: 22px;
    height: 22px;
    margin: 0;
  }
  .box {
    flex: none;
    width: 20px;
    height: 20px;
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
    width: 10px;
    height: 5px;
    border-left: 2.5px solid var(--marker);
    border-bottom: 2.5px solid var(--marker);
    transform: rotate(-45deg) translate(1px, -1px);
  }
  input:focus-visible + .box {
    outline: 3px solid color-mix(in srgb, var(--signal) 55%, transparent);
    outline-offset: 2px;
  }
</style>
