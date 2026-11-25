<!-- Rahmen für eine einzeln gebaute Simulation (npm run build:sim). -->
<script lang="ts">
  import SimHost from '../lib/sim/SimHost.svelte';
  import type { SimDef } from '../lib/sim/types';

  let { def }: { def: SimDef } = $props();
  const embedded = new URLSearchParams(location.search).has('embed');
</script>

{#if !embedded}
  <header class="topbar"><h1>{def.title}</h1></header>
{/if}
<main class:embedded>
  <SimHost {def} />
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
