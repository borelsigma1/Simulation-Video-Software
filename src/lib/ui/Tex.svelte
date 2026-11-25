<!-- Beliebiger TeX-Ausdruck, gesetzt mit KaTeX. -->
<script lang="ts">
  import { tex } from '../tex/tex';
  let { src, display = false }: { src: string; display?: boolean } = $props();
  const html = $derived(tex(src, display));
</script>

{@html html}
