<!-- Eine Simulation allein: zum Vorführen am Beamer oder zum Einbetten (?embed) in mebis. -->
<script lang="ts">
  import { publishedById } from '../lib/content/store.svelte';
  import { href, router } from '../lib/router.svelte';
  import SimHost from '../lib/sim/SimHost.svelte';
  import { simById } from '../sims';

  let { simId, lessonId }: { simId?: string; lessonId?: string } = $props();

  const lesson = $derived(lessonId ? publishedById(lessonId) : undefined);
  const def = $derived(simById(lesson?.sim.id ?? simId ?? ''));
  const title = $derived(lesson?.title ?? def?.title ?? 'Simulation');
  const standalone = import.meta.env.VITE_STANDALONE === '1';
</script>

{#if !router.embed}
  <header class="topbar">
    {#if lesson}
      <a class="back" href={href(`einheit/${lesson.id}`)}>← Lerneinheit</a>
    {:else if !standalone}
      <a class="back" href={href('')}>← Übersicht</a>
    {/if}
    <h1>{title}</h1>
  </header>
{/if}
<main class:embedded={router.embed}>
  {#if def}
    <SimHost {def} config={lesson?.sim} />
  {:else}
    <p>Diese Simulation gibt es nicht. <a href={href('')}>Zur Übersicht</a></p>
  {/if}
</main>

<style>
  main {
    padding: 18px;
    max-width: 1300px;
    margin: 0 auto;
  }
  main.embedded {
    padding: 8px;
    max-width: none;
  }
</style>
