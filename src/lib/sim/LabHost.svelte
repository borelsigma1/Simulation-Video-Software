<!--
  Rahmen für eigenständige Labore mit eigener Oberfläche (SimDef.mount),
  z. B. das Schrödinger-Labor. Startwerte kommen wie bei allen Simulationen
  aus der Lerneinheit (SimConfig), etwa welcher Reiter zuerst offen ist.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { measurements } from '../measure/bus.svelte';
  import { resolveSim } from './resolve';
  import type { LabInstance, SimConfig, SimDef } from './types';

  let { def, config }: { def: SimDef; config?: SimConfig } = $props();
  let host: HTMLDivElement;
  let failed = $state('');

  onMount(() => {
    const D = untrack(() => def);
    const R = resolveSim(D, untrack(() => config));
    const p = Object.fromEntries(R.params.map((x) => [x.key, x.value]));
    let lab: LabInstance | null = null;
    let gone = false;
    measurements.define([], D.title);
    Promise.resolve(D.mount!(host, { p }))
      .then((l) => {
        if (gone) l.destroy();
        else {
          lab = l;
          if (l.snapshot) measurements.snapshot = l.snapshot;
        }
      })
      .catch((e) => (failed = String(e?.message ?? e)));
    return () => {
      gone = true;
      lab?.destroy();
      measurements.clear();
    };
  });
</script>

<div class="lab" bind:this={host}></div>
{#if failed}<p class="sheet err">Das Labor konnte nicht starten: {failed}</p>{/if}

<style>
  .lab {
    min-width: 0;
  }
  .err {
    padding: 14px;
  }
</style>
