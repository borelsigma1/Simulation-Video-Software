<!--
  Lerneinheit: Simulation links, Video und Arbeitsblatt rechts.
  Auf schmalen Bildschirmen (Tablet hochkant, Handy) untereinander.
-->
<script lang="ts">
  import type { Component } from 'svelte';
  import VideoPanel from './video/VideoPanel.svelte';
  import WorksheetView from './worksheet/WorksheetView.svelte';
  import type { LessonVideo } from './video/types';
  import type { Worksheet } from './worksheet/types';

  interface Props {
    title: string;
    sim: Component;
    video?: LessonVideo;
    worksheet?: Worksheet;
  }
  let { title, sim: Sim, video, worksheet }: Props = $props();
</script>

<header class="page-header">
  <a class="home" href="../../">← Übersicht</a>
  <h1>{title}</h1>
</header>

<main class="lesson">
  <section class="simcol" aria-label="Simulation">
    <Sim />
  </section>
  <aside class="side">
    {#if video}<VideoPanel {video} />{/if}
    {#if worksheet}
      <div class="card"><WorksheetView {worksheet} /></div>
    {/if}
  </aside>
</main>

<style>
  .lesson {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
    max-width: 1700px;
    margin: 0 auto;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .simcol {
    min-width: 0;
  }
  @media (min-width: 1100px) {
    .lesson {
      grid-template-columns: minmax(0, 3fr) minmax(380px, 2fr);
      align-items: start;
    }
    /* Simulation bleibt beim Scrollen durch das Arbeitsblatt sichtbar */
    .simcol {
      position: sticky;
      top: 16px;
    }
  }
</style>
