<!-- Rahmen für eine einzeln gehostete Simulation. -->
<script lang="ts">
  import type { Component } from 'svelte';
  interface Props {
    title: string;
    sim: Component;
    /** Link zur Übersicht ausblenden (z. B. beim Einbetten per iframe) */
    standalone?: boolean;
  }
  let { title, sim: Sim, standalone = false }: Props = $props();
  const embedded = new URLSearchParams(location.search).has('embed');
</script>

{#if !embedded}
  <header class="page-header">
    {#if !standalone}<a class="home" href="../../">← Übersicht</a>{/if}
    <h1>{title}</h1>
  </header>
{/if}
<main class:embedded>
  <Sim />
</main>

<style>
  main {
    padding: 16px;
    max-width: 1300px;
    margin: 0 auto;
  }
  main.embedded {
    padding: 8px;
    max-width: none;
  }
</style>
