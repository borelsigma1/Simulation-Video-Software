<script lang="ts">
  let { label, checked = $bindable() }: { label: string; checked: boolean } = $props();
</script>

<label class="toggle">
  <input type="checkbox" bind:checked />
  <span>{label}</span>
</label>

<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    font-size: 0.92rem;
    cursor: pointer;
  }
  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent);
  }
</style>
