<!-- Formelzeichen mit KaTeX: "v_y" wird zu v mit Index y, gesetzt wie im Schulbuch. -->
<script lang="ts">
  import { symTex, tex } from '../tex/tex';
  let { text }: { text: string } = $props();
  const html = $derived(tex(symTex(text)));
</script>

<span class="sym-k">{@html html}</span>

<style>
  .sym-k {
    white-space: nowrap;
  }
</style>
