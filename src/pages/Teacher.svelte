<!-- Lehrkraft-Modus: Lerneinheiten bearbeiten, duplizieren, neu anlegen, importieren. -->
<script lang="ts">
  import { allForTeacher, drafts, freeId, publishedById } from '../lib/content/store.svelte';
  import { DOMAINS, GRADES, type Lesson } from '../lib/content/types';
  import { checkLesson, normalizeLesson } from '../lib/content/validate';
  import { downloadLesson } from '../lib/editor/github';
  import { href, router } from '../lib/router.svelte';
  import { simById, sims } from '../sims';

  const lessons = $derived(allForTeacher());
  let message = $state('');
  let newSim = $state(sims[0].id);
  let newGrade = $state(8);
  let fileInput: HTMLInputElement;

  const status = (l: Lesson) => (!publishedById(l.id) ? 'Entwurf' : drafts.all[l.id] ? 'geändert' : 'veröffentlicht');

  function duplicate(l: Lesson) {
    const copy: Lesson = JSON.parse(JSON.stringify(l));
    copy.id = freeId(`${l.id}-kopie`);
    copy.title = `${l.title} (Kopie)`;
    copy.order = l.order + 1;
    drafts.save(copy);
    router.go(`lehrkraft/${copy.id}`);
  }

  function create() {
    const def = simById(newSim)!;
    const l: Lesson = normalizeLesson({
      id: freeId(def.title),
      title: def.title,
      grade: newGrade,
      order: lessons.filter((x) => x.grade === newGrade).length + 1,
      domain: 'mechanik',
      curriculum: '',
      summary: def.summary,
      sim: { id: def.id },
      worksheet: { title: def.title, subtitle: `Jahrgangsstufe ${newGrade}`, blocks: [] }
    });
    drafts.save(l);
    router.go(`lehrkraft/${l.id}`);
  }

  async function importFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const l = normalizeLesson(JSON.parse(await file.text()));
      const problems = checkLesson(l, simById(l.sim.id));
      if (problems.length) {
        message = `Die Datei wurde nicht übernommen: ${problems.slice(0, 3).join(' ')}`;
        return;
      }
      if (lessons.some((x) => x.id === l.id) && !confirm(`Es gibt bereits eine Einheit „${l.id}“. Mit der Datei überschreiben (als Entwurf)?`)) return;
      drafts.save(l);
      router.go(`lehrkraft/${l.id}`);
    } catch {
      message = 'Die Datei ließ sich nicht lesen. Erwartet wird eine exportierte Lerneinheit (.json).';
    } finally {
      fileInput.value = '';
    }
  }

  function discard(l: Lesson) {
    const pub = publishedById(l.id);
    const q = pub
      ? `Änderungen an „${l.title}“ verwerfen und zur veröffentlichten Fassung zurückkehren?`
      : `Entwurf „${l.title}“ endgültig löschen? Er wurde noch nicht veröffentlicht.`;
    if (confirm(q)) drafts.remove(l.id);
  }
</script>

<header class="topbar">
  <a class="back" href={href('')}>← Übersicht</a>
  <h1>Lehrkraft-Modus</h1>
</header>

<main>
  <section class="intro sheet">
    <h2>Lerneinheiten anpassen</h2>
    <p>
      Hier änderst du Aufgaben, Regler, Voreinstellungen und Angaben einer Lerneinheit. Die Physik der Simulationen ist fest
      programmiert. Änderungen liegen zunächst als <b>Entwurf nur in diesem Browser</b>; online gehen sie, wenn du sie im Editor
      veröffentlichst oder die exportierte Datei ins Repository legst.
    </p>
    <div class="row">
      <label>
        Neue Einheit mit
        <select class="field" bind:value={newSim}>
          {#each sims as s (s.id)}<option value={s.id}>{s.title}</option>{/each}
        </select>
      </label>
      <label>
        Jahrgangsstufe
        <select class="field" bind:value={newGrade}>
          {#each GRADES as g (g)}<option value={g}>{g}</option>{/each}
        </select>
      </label>
      <button class="btn primary" onclick={create}>Anlegen</button>
      <span class="grow"></span>
      <button class="btn" onclick={() => fileInput.click()}>Datei importieren</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importFile} />
    </div>
    {#if message}<p class="msg" role="alert">{message}</p>{/if}
  </section>

  {#each GRADES as g (g)}
    {@const list = lessons.filter((l) => l.grade === g)}
    {#if list.length}
      <section>
        <h2 class="gradehead"><span class="n">{g}</span> Jahrgangsstufe</h2>
        <ul>
          {#each list as l (l.id)}
            <li class="sheet" style:--d={`var(--d-${l.domain})`}>
              <div class="what">
                <p class="eyebrow">{DOMAINS[l.domain]} · {simById(l.sim.id)?.title ?? l.sim.id}</p>
                <h3>{l.title}</h3>
                <p class="muted small">{l.curriculum || 'ohne Lehrplanbezug'}</p>
              </div>
              <span class="status" data-s={status(l)}>{status(l)}</span>
              <div class="acts">
                <a class="btn small green" href={href(`lehrkraft/${l.id}`)}>Bearbeiten</a>
                <a class="btn small" href={href(`lehrkraft/vorschau/${l.id}`)}>Vorschau</a>
                <button class="btn small" onclick={() => duplicate(l)}>Duplizieren</button>
                <button class="btn small" onclick={() => downloadLesson(l)}>Exportieren</button>
                {#if drafts.all[l.id]}
                  <button class="btn small ghost" onclick={() => discard(l)}>{publishedById(l.id) ? 'Änderungen verwerfen' : 'Entwurf löschen'}</button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/each}
</main>

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 22px;
    display: grid;
    gap: 26px;
  }
  .intro {
    padding: 20px 22px;
  }
  .intro h2 {
    font-size: 1.5rem;
  }
  .intro p {
    margin: 0 0 16px;
    max-width: 75ch;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 14px;
  }
  .row label {
    display: grid;
    gap: 3px;
    font-size: 0.82rem;
    color: var(--muted);
  }
  .grow {
    flex: 1;
  }
  .msg {
    margin: 14px 0 0 !important;
    color: var(--signal-dark);
    font-weight: 600;
  }
  .gradehead {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 1.1rem;
    margin: 0 0 10px;
  }
  .n {
    font-size: 2.2rem;
    font-weight: 800;
    color: var(--signal);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px 14px;
    align-items: center;
    padding: 12px 16px;
    border-left: 6px solid var(--d);
  }
  .what p {
    margin: 0;
  }
  h3 {
    font-size: 1.15rem;
    margin: 2px 0;
  }
  .small {
    font-size: 0.86rem;
  }
  .status {
    font-family: var(--mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 3px 9px;
    border-radius: 999px;
    border: 1.5px solid var(--ink);
    background: var(--sheet-2);
  }
  .status[data-s='Entwurf'],
  .status[data-s='geändert'] {
    background: var(--marker);
  }
  .acts {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
