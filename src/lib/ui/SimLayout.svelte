<!--
  Gemeinsames Layout aller Simulationen: Bühne (Canvas) oben, darunter
  Bedienleiste, dann Regler und Diagramm. Passt sich per Container-Query an
  die verfügbare Breite an (eigene Seite, Lerneinheit, Tablet hochkant).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    stage: Snippet;
    toolbar: Snippet;
    controls: Snippet;
    plot?: Snippet;
    readouts?: Snippet;
  }
  let { stage, toolbar, controls, plot, readouts }: Props = $props();
</script>

<div class="sim">
  <div class="stage">{@render stage()}</div>
  <div class="bar">
    <div class="tools">{@render toolbar()}</div>
    {#if readouts}<div class="readouts">{@render readouts()}</div>{/if}
  </div>
  <div class="lower">
    <section class="controls" aria-label="Einstellungen">{@render controls()}</section>
    {#if plot}<section class="plot" aria-label="Diagramm">{@render plot()}</section>{/if}
  </div>
</div>

<style>
  .sim {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .stage {
    position: relative;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    height: clamp(280px, 52vh, 560px);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .lower {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .controls,
  .plot {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    min-width: 0;
  }
  .controls {
    display: grid;
    gap: 10px;
    align-content: start;
  }
  @container (min-width: 760px) {
    .lower {
      grid-template-columns: minmax(240px, 1fr) 2fr;
    }
  }
</style>
