<!-- Start/Pause, Einzelschritt, Zurücksetzen und Zeitlupe -->
<script lang="ts">
  interface Props {
    running: boolean;
    finished?: boolean;
    speed: number;
    onplay: () => void;
    onreset: () => void;
    onstep?: () => void;
    onspeed: (v: number) => void;
    playLabel?: string;
  }
  let { running, finished = false, speed, onplay, onreset, onstep, onspeed, playLabel = 'Start' }: Props = $props();
</script>

<button class="btn primary play" onclick={onplay} aria-pressed={running}>
  {#if running}
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" /></svg>
    Pause
  {:else if finished}
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2a5 5 0 1 1-4.6 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><path d="M1 1.5v4h4z" fill="currentColor" /></svg>
    Nochmal
  {:else}
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor" /></svg>
    {playLabel}
  {/if}
</button>
{#if onstep}
  <button class="btn" onclick={onstep} disabled={running || finished} title="Einen Zeitschritt weiter">Schritt</button>
{/if}
<button class="btn" onclick={onreset}>Zurücksetzen</button>
<label>
  <span class="visually-hidden">Geschwindigkeit</span>
  <select class="btn" value={speed} onchange={(e) => onspeed(Number(e.currentTarget.value))} title="Zeitlupe">
    <option value={1}>Echtzeit</option>
    <option value={0.5}>Zeitlupe ½×</option>
    <option value={0.25}>Zeitlupe ¼×</option>
    <option value={0.1}>Zeitlupe ⅒×</option>
  </select>
</label>

<style>
  .play {
    min-width: 7.5em;
  }
</style>
