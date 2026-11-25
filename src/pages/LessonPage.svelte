<!--
  Lerneinheit: Simulation links, Video und Arbeitsblatt rechts.
  Auf schmalen Bildschirmen (Tablet hochkant, Handy) untereinander.
-->
<script lang="ts">
  import { drafts, lessonForEditing, publishedById } from '../lib/content/store.svelte';
  import { DOMAINS } from '../lib/content/types';
  import { href } from '../lib/router.svelte';
  import SimHost from '../lib/sim/SimHost.svelte';
  import VideoPanel from '../lib/video/VideoPanel.svelte';
  import WorksheetView from '../lib/worksheet/WorksheetView.svelte';
  import { simById } from '../sims';

  /** teacher: Vorschau aus dem Lehrkraft-Modus (Entwurf, mit Erwartungshorizont) */
  let { id, teacher = false }: { id: string; teacher?: boolean } = $props();

  const lesson = $derived(teacher ? lessonForEditing(id) : publishedById(id));
  const def = $derived(lesson ? simById(lesson.sim.id) : undefined);
  const isDraft = $derived(teacher && !!drafts.all[id]);

  $effect(() => {
    document.title = lesson ? `${lesson.title} · Physik-Workspace` : 'Physik-Workspace';
  });
</script>

{#if !lesson}
  <header class="topbar"><a class="back" href={href('')}>← Übersicht</a><h1>Lerneinheit nicht gefunden</h1></header>
  <main class="missing"><p>Diese Lerneinheit gibt es nicht (mehr). <a href={href('')}>Zur Übersicht</a></p></main>
{:else}
  <header class="topbar">
    {#if teacher}
      <a class="back" href={href(`lehrkraft/${id}`)}>← Editor</a>
    {:else}
      <a class="back" href={href(`klasse/${lesson.grade}`)}>← Jgst. {lesson.grade}</a>
    {/if}
    <h1>{lesson.title}</h1>
    <span class="grow"></span>
    <span class="tag" style:--d={`var(--d-${lesson.domain})`}>{DOMAINS[lesson.domain]}</span>
  </header>
  {#if teacher}
    <p class="banner">
      Vorschau im Lehrkraft-Modus{isDraft ? ' (Entwurf, noch nicht veröffentlicht)' : ''}. Der Erwartungshorizont ist nur hier sichtbar.
    </p>
  {/if}

  <main class="lesson">
    <section class="simcol" aria-label="Simulation">
      {#if def}
        <SimHost {def} config={lesson.sim} />
      {:else}
        <p class="sheet pad">Die Simulation „{lesson.sim.id}“ gibt es nicht.</p>
      {/if}
    </section>
    <aside class="side">
      {#if lesson.video.source.kind !== 'none'}<VideoPanel video={lesson.video} />{/if}
      <div class="sheet paper"><WorksheetView worksheet={lesson.worksheet} {teacher} /></div>
      <p class="eyebrow cur">{lesson.curriculum}</p>
    </aside>
  </main>
{/if}

<style>
  .lesson {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 18px;
    max-width: 1760px;
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
  .tag {
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    padding: 4px 9px;
    border-radius: 999px;
    background: var(--chalk);
    color: var(--d);
    font-weight: 600;
  }
  .banner {
    margin: 0;
    padding: 8px 20px;
    background: var(--marker);
    font-size: 0.9rem;
    font-weight: 600;
    border-bottom: 1.5px solid var(--ink);
  }
  .cur {
    margin: 0 4px;
    text-transform: none;
    letter-spacing: 0.01em;
  }
  .missing,
  .pad {
    padding: 24px;
  }
  @media (min-width: 1100px) {
    .lesson {
      grid-template-columns: minmax(0, 3fr) minmax(400px, 2fr);
      align-items: start;
    }
    /* Simulation bleibt beim Scrollen durch das Arbeitsblatt sichtbar */
    .simcol {
      position: sticky;
      top: 14px;
    }
  }
  @media (max-width: 700px) {
    .tag {
      display: none;
    }
  }
</style>
