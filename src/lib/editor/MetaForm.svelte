<!-- Angaben zur Lerneinheit: Titel, Jahrgangsstufe, Lehrplanbezug, Video. -->
<script lang="ts">
  import { DOMAINS, GRADES, type Lesson } from '../content/types';

  let { lesson = $bindable() }: { lesson: Lesson } = $props();

  function videoKind(kind: string) {
    lesson.video.source =
      kind === 'file' ? { kind: 'file', src: 'videos/' } : kind === 'youtube' ? { kind: 'youtube', id: '' } : { kind: 'none' };
  }
</script>

<div class="group">
  <label>Titel der Lerneinheit <input class="field" bind:value={lesson.title} /></label>
  <div class="grid g3">
    <label>
      Jahrgangsstufe
      <select class="field" bind:value={lesson.grade}>
        {#each GRADES as g (g)}<option value={g}>{g}</option>{/each}
      </select>
    </label>
    <label>
      Reihenfolge in der Stufe
      <input class="field" type="number" min="1" step="1" bind:value={lesson.order} />
    </label>
    <label>
      Themengebiet (Farbe)
      <select class="field" bind:value={lesson.domain}>
        {#each Object.entries(DOMAINS) as [k, name] (k)}<option value={k}>{name}</option>{/each}
      </select>
    </label>
  </div>
  <label>
    Lehrplanbezug
    <input class="field" bind:value={lesson.curriculum} placeholder="z. B. Ph8 Lernbereich 2: Optik" />
  </label>
  <label>
    Kurzbeschreibung für die Übersicht
    <textarea class="field" rows="3" bind:value={lesson.summary}></textarea>
  </label>
  <p class="hint">Dateiname im Repository: <code>content/einheiten/{lesson.id}.json</code></p>
</div>

<div class="group">
  <h3>Lernvideo</h3>
  <div class="grid g2">
    <label>
      Quelle
      <select class="field" value={lesson.video.source.kind} onchange={(e) => videoKind(e.currentTarget.value)}>
        <option value="none">kein Video</option>
        <option value="file">eigene Datei</option>
        <option value="youtube">YouTube</option>
      </select>
    </label>
    <label>Titel des Videos <input class="field" bind:value={lesson.video.title} /></label>
  </div>
  {#if lesson.video.source.kind === 'file'}
    <label>
      Pfad der Datei
      <input class="field" bind:value={lesson.video.source.src} placeholder="videos/federpendel.mp4" />
    </label>
    <p class="hint">Die Datei gehört in den Ordner <code>public/videos/</code> des Repositorys. Das ist die datenschutzfreundlichste Variante.</p>
  {:else if lesson.video.source.kind === 'youtube'}
    <label>
      YouTube-Kennung (der Teil hinter „v=“)
      <input class="field" bind:value={lesson.video.source.id} placeholder="dQw4w9WgXcQ" />
    </label>
    <p class="hint">Das Video wird erst nach einem Klick geladen; vorher fließen keine Daten zu YouTube.</p>
  {/if}
</div>
