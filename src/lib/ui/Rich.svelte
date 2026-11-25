<!--
  Text aus einer Inhaltsdatei: **fett** und Formeln zwischen Dollarzeichen.
  inline: nur eine Zeile ohne Absätze (Aufgabenstellungen, Antwortoptionen).
  Kein HTML aus dem Inhalt: Text wird immer als Text eingesetzt, nur KaTeX erzeugt Markup.
-->
<script lang="ts">
  import { paragraphs } from '../worksheet/richtext';
  import { mathHtml } from '../tex/tex';
  let { text, inline = false }: { text: string; inline?: boolean } = $props();
  const paras = $derived(paragraphs(text));
</script>

{#snippet run(t: string)}{@html mathHtml(t)}{/snippet}

{#if inline}
  {#each paras as p, pi (pi)}{#if pi > 0}{' '}{/if}{#each p as s, si (si)}{#if s.bold}<strong>{@render run(s.text)}</strong>{:else}{@render run(s.text)}{/if}{/each}{/each}
{:else}
  {#each paras as p, pi (pi)}
    <p>{#each p as s, si (si)}{#if s.bold}<strong>{@render run(s.text)}</strong>{:else}{@render run(s.text)}{/if}{/each}</p>
  {/each}
{/if}
