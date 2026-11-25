<!-- Formelzeichen mit Index: "v_y" wird zu v<sub>y</sub>, gesetzt wie im Schulbuch. -->
<script lang="ts">
  import { splitSubscripts } from '../engine/draw';
  let { text }: { text: string } = $props();
  const parts = $derived(splitSubscripts(text));
</script>

<span class="sym">{#each parts as p, i (i)}{#if p.sub}<sub>{p.text}</sub>{:else}{p.text}{/if}{/each}</span>
