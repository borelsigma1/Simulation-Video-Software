<!--
  Lerneinheit, zweigeteilt:
  links das Experiment (Simulation mit kompakter Steuerung, füllt die
  Bildschirmhöhe, kein Scrollen), rechts das Arbeitsblatt mit eigenem
  Scrollbalken. Auf schmalen oder hochkant gehaltenen Bildschirmen werden
  daraus zwei Reiter „Experiment“ und „Arbeitsblatt“. Beide Teile bleiben
  dabei geladen, damit Messwerte und Eingaben beim Umschalten erhalten bleiben.
-->
<script lang="ts">
  import { drafts, lessonForEditing, publishedById } from '../lib/content/store.svelte';
  import { DOMAINS } from '../lib/content/types';
  import { href } from '../lib/router.svelte';
  import LabHost from '../lib/sim/LabHost.svelte';
  import SimHost from '../lib/sim/SimHost.svelte';
  import VideoPanel from '../lib/video/VideoPanel.svelte';
  import WorksheetView from '../lib/worksheet/WorksheetView.svelte';
  import { simById } from '../sims';

  /** teacher: Vorschau aus dem Lehrkraft-Modus (Entwurf, mit Erwartungshorizont) */
  let { id, teacher = false }: { id: string; teacher?: boolean } = $props();

  const lesson = $derived(teacher ? lessonForEditing(id) : publishedById(id));
  const def = $derived(lesson ? simById(lesson.sim.id) : undefined);
  const isDraft = $derived(teacher && !!drafts.all[id]);

  let tab = $state<'sim' | 'ws'>('sim');

  $effect(() => {
    document.title = lesson ? `${lesson.title} · Physik-Workspace` : 'Physik-Workspace';
  });
</script>

{#if !lesson}
  <header class="topbar"><a class="back" href={href('')}>← Übersicht</a><h1>Lerneinheit nicht gefunden</h1></header>
  <main class="missing"><p>Diese Lerneinheit gibt es nicht (mehr). <a href={href('')}>Zur Übersicht</a></p></main>
{:else}
  <div class="page">
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

    <div class="tabs" role="tablist" aria-label="Ansicht wählen">
      <button role="tab" aria-selected={tab === 'sim'} aria-controls="pane-sim" onclick={() => (tab = 'sim')}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
          ><path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="M7 15h10" stroke="currentColor" stroke-width="2" /></svg
        >
        Experiment
      </button>
      <button role="tab" aria-selected={tab === 'ws'} aria-controls="pane-ws" onclick={() => (tab = 'ws')}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
          ><path d="M6 2h9l4 4v16H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="M9 11h7M9 15h7M9 19h4" stroke="currentColor" stroke-width="2" /></svg
        >
        Arbeitsblatt
      </button>
    </div>

    <main class="lesson" data-tab={tab}>
      <section class="pane simpane" id="pane-sim" aria-label="Experiment">
        {#if def?.mount}
          <LabHost {def} config={lesson.sim} />
        {:else if def}
          <SimHost {def} config={lesson.sim} fill />
        {:else}
          <p class="sheet pad">Die Simulation „{lesson.sim.id}“ gibt es nicht.</p>
        {/if}
      </section>
      <aside class="pane wspane" id="pane-ws" aria-label="Arbeitsblatt">
        <div class="wsinner">
          {#if lesson.video.source.kind !== 'none'}<VideoPanel video={lesson.video} />{/if}
          <div class="sheet paper"><WorksheetView worksheet={lesson.worksheet} {teacher} /></div>
          <p class="eyebrow cur">{lesson.curriculum}</p>
        </div>
      </aside>
    </main>
  </div>
{/if}

<style>
  /* Die Seite ist genau so hoch wie das Fenster; gescrollt wird nur innerhalb der Bereiche. */
  .page {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .page > :not(.lesson) {
    flex: none;
  }
  .lesson {
    flex: 1 1 0;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    position: relative;
    max-width: 1920px;
    width: 100%;
    margin: 0 auto;
  }
  .pane {
    min-width: 0;
    min-height: 0;
  }
  .simpane {
    padding: 12px;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }
  .simpane > :global(*) {
    flex: 1 1 auto;
    min-height: 0;
  }
  .wspane {
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }
  .wsinner {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 12px 14px 28px;
    max-width: 860px;
    margin: 0 auto;
  }

  /* Reiter (nur bei schmalem oder hochkant gehaltenem Bildschirm) */
  .tabs {
    display: flex;
    gap: 0;
    background: var(--board);
    padding: 0 12px;
    border-bottom: 1.5px solid var(--ink);
  }
  .tabs button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    border: 0;
    border-radius: var(--radius) var(--radius) 0 0;
    margin-top: 6px;
    background: transparent;
    color: var(--chalk);
    font-weight: 700;
    font-family: var(--display);
    font-size: 1rem;
    opacity: 0.75;
  }
  .tabs button[aria-selected='true'] {
    background: var(--paper);
    color: var(--ink);
    opacity: 1;
  }
  .lesson > .pane {
    grid-area: 1 / 1;
  }
  /* Der nicht gewählte Reiter bleibt geladen (Messwerte!), ist aber unsichtbar. */
  .lesson[data-tab='sim'] .wspane,
  .lesson[data-tab='ws'] .simpane {
    visibility: hidden;
    pointer-events: none;
  }

  /* Breiter Bildschirm im Querformat: nebeneinander, Reiter ausgeblendet */
  @media (min-width: 1000px) and (min-aspect-ratio: 1/1) {
    .tabs {
      display: none;
    }
    .lesson {
      grid-template-columns: minmax(0, 1.45fr) minmax(400px, 1fr);
    }
    .lesson > .simpane {
      grid-area: 1 / 1;
    }
    .lesson > .wspane {
      grid-area: 1 / 2;
      border-left: 1.5px solid var(--ink);
      background: color-mix(in srgb, var(--paper) 70%, var(--sheet));
    }
    .lesson[data-tab] .pane {
      visibility: visible;
      pointer-events: auto;
    }
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
  @media (max-width: 700px) {
    .tag {
      display: none;
    }
    .simpane {
      padding: 8px;
    }
    .wsinner {
      padding: 8px 8px 24px;
    }
  }
</style>
