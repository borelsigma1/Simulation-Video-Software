<!-- Start/Pause, Einzelschritt, Zurücksetzen und Zeitlupe -->
<script lang="ts">
  interface Props {
    running: boolean;
    finished?: boolean;
    speed: number;
    onplay: () => void;
    onreset: () => void;
    onstep?: () => void;
    playLabel?: string;
  }
  let {
    running,
    finished = false,
    speed = $bindable(),
    onplay,
    onreset,
    onstep,
    playLabel = 'Start'
  }: Props = $props();
</script>

<button class="btn primary" onclick={onplay} disabled={finished} aria-pressed={running}>
  {#if running}
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" /></svg>
    Pause
  {:else}
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor" /></svg>
    {playLabel}
  {/if}
</button>
{#if onstep}
  <button class="btn" onclick={onstep} disabled={running || finished} title="Einen Zeitschritt weiter">
    Schritt
  </button>
{/if}
<button class="btn" onclick={onreset}>Zurücksetzen</button>
<label class="speed">
  <span class="visually-hidden">Geschwindigkeit</span>
  <select class="btn" bind:value={speed} title="Zeitlupe">
    <option value={1}>Echtzeit</option>
    <option value={0.5}>Zeitlupe ½×</option>
    <option value={0.25}>Zeitlupe ¼×</option>
    <option value={0.1}>Zeitlupe ⅒×</option>
  </select>
</label>
