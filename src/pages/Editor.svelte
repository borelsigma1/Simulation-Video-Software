<!--
  Editor einer Lerneinheit: links das Formular, rechts die Live-Vorschau.
  Jede Änderung wird als Entwurf in diesem Browser gesichert.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import '../lib/editor/form.css';
  import { drafts, lessonForEditing, publishedById } from '../lib/content/store.svelte';
  import type { Lesson } from '../lib/content/types';
  import { checkLesson } from '../lib/content/validate';
  import { downloadLesson, forgetToken, lessonPath, loadSettings, publishLesson, saveSettings } from '../lib/editor/github';
  import MetaForm from '../lib/editor/MetaForm.svelte';
  import SimForm from '../lib/editor/SimForm.svelte';
  import WorksheetForm from '../lib/editor/WorksheetForm.svelte';
  import { href } from '../lib/router.svelte';
  import SimHost from '../lib/sim/SimHost.svelte';
  import WorksheetView from '../lib/worksheet/WorksheetView.svelte';
  import { simById } from '../sims';

  let { id }: { id: string } = $props();

  const start = untrack(() => lessonForEditing(id));
  let lesson = $state<Lesson | undefined>(start ? JSON.parse(JSON.stringify(start)) : undefined);
  const def = $derived(lesson ? simById(lesson.sim.id) : undefined);
  const problems = $derived(lesson ? checkLesson(lesson, def) : []);

  let tab = $state<'ws' | 'sim' | 'meta'>('ws');
  let pv = $state<'sim' | 'ws'>('sim');

  // ---------- Entwurf automatisch sichern ----------
  const json = $derived(JSON.stringify(lesson));
  let savedJson = untrack(() => json);
  let saveState = $state<'idle' | 'saved'>('idle');
  const isDraft = $derived(!!drafts.all[id]);
  $effect(() => {
    const j = json;
    if (!lesson || j === savedJson) return;
    const t = setTimeout(() => {
      savedJson = j;
      drafts.save(JSON.parse(j));
      saveState = 'saved';
    }, 400);
    return () => clearTimeout(t);
  });

  // ---------- Vorschau (leicht verzögert, damit Tippen flüssig bleibt) ----------
  let simKey = $state(untrack(() => JSON.stringify(lesson?.sim)));
  let wsKey = $state(untrack(() => JSON.stringify(lesson?.worksheet)));
  $effect(() => {
    const s = JSON.stringify(lesson?.sim);
    const w = JSON.stringify(lesson?.worksheet);
    const t = setTimeout(() => {
      simKey = s;
      wsKey = w;
    }, 350);
    return () => clearTimeout(t);
  });

  function discard() {
    const pub = publishedById(id);
    if (!pub) return;
    if (!confirm('Alle Änderungen verwerfen und zur veröffentlichten Fassung zurückkehren?')) return;
    drafts.remove(id);
    lesson = JSON.parse(JSON.stringify(pub));
    savedJson = JSON.stringify(lesson);
    saveState = 'idle';
  }

  // ---------- Veröffentlichen ----------
  let dialog = $state<HTMLDialogElement>();
  let gh = $state(loadSettings());
  let remember = $state(untrack(() => !!gh.token));
  let busy = $state(false);
  let result = $state<{ ok: boolean; text: string; url?: string } | null>(null);

  async function publish() {
    if (!lesson) return;
    busy = true;
    result = null;
    try {
      if (remember) saveSettings($state.snapshot(gh));
      else {
        saveSettings({ ...$state.snapshot(gh), token: '' });
      }
      const url = await publishLesson($state.snapshot(gh), $state.snapshot(lesson) as Lesson);
      result = {
        ok: true,
        url,
        text: `Gespeichert in ${gh.owner}/${gh.repo} (${gh.branch}). Die Seite wird jetzt neu gebaut und ist in wenigen Minuten aktuell.`
      };
    } catch (e) {
      result = { ok: false, text: e instanceof Error ? e.message : String(e) };
    } finally {
      busy = false;
    }
  }
</script>

{#if !lesson || !def}
  <header class="topbar"><a class="back" href={href('lehrkraft')}>← Lehrkraft-Modus</a><h1>Lerneinheit nicht gefunden</h1></header>
{:else}
  <header class="topbar">
    <a class="back" href={href('lehrkraft')}>← Lehrkraft-Modus</a>
    <h1>{lesson.title || 'Ohne Titel'}</h1>
    <span class="grow"></span>
    <span class="save" class:on={isDraft}>
      {isDraft ? (saveState === 'saved' ? 'Entwurf gesichert' : 'Entwurf') : 'wie veröffentlicht'}
    </span>
  </header>

  <div class="toolbar">
    <div class="tabs" role="tablist" aria-label="Bereich bearbeiten">
      <button role="tab" aria-selected={tab === 'ws'} onclick={() => ((tab = 'ws'), (pv = 'ws'))}>Arbeitsblatt</button>
      <button role="tab" aria-selected={tab === 'sim'} onclick={() => ((tab = 'sim'), (pv = 'sim'))}>Simulation</button>
      <button role="tab" aria-selected={tab === 'meta'} onclick={() => (tab = 'meta')}>Einheit</button>
    </div>
    <span class="grow"></span>
    {#if isDraft && publishedById(id)}<button class="btn small ghost" onclick={discard}>Änderungen verwerfen</button>{/if}
    <a class="btn small" href={href(`lehrkraft/vorschau/${id}`)}>Ganze Seite ansehen</a>
    <button class="btn small" onclick={() => downloadLesson($state.snapshot(lesson) as Lesson)}>Als Datei exportieren</button>
    <button class="btn small primary" onclick={() => ((result = null), dialog?.showModal())}>Veröffentlichen …</button>
  </div>

  <main class="split">
    <section class="form ed" aria-label="Bearbeiten">
      {#if problems.length}
        <div class="problems" role="alert">
          <b>Bitte prüfen:</b>
          <ul>{#each problems as p (p)}<li>{p}</li>{/each}</ul>
        </div>
      {/if}
      {#if tab === 'ws'}
        <WorksheetForm bind:worksheet={lesson.worksheet} {def} />
      {:else if tab === 'sim'}
        <SimForm bind:sim={lesson.sim} {def} />
      {:else}
        <MetaForm bind:lesson />
      {/if}
    </section>

    <section class="preview" aria-label="Vorschau">
      <div class="pvhead">
        <span class="eyebrow">Vorschau</span>
        <div class="tabs small" role="tablist" aria-label="Vorschau wählen">
          <button role="tab" aria-selected={pv === 'sim'} onclick={() => (pv = 'sim')}>Simulation</button>
          <button role="tab" aria-selected={pv === 'ws'} onclick={() => (pv = 'ws')}>Arbeitsblatt</button>
        </div>
      </div>
      <!-- Die Simulation bleibt auch hinter dem Arbeitsblatt aktiv, damit „Messwerte übernehmen“ in der Vorschau funktioniert. -->
      <div class:hide={pv !== 'sim'}>
        {#key simKey}<SimHost {def} config={JSON.parse(simKey)} />{/key}
      </div>
      {#if pv === 'ws'}
        <div class="sheet">
          {#key wsKey}<WorksheetView worksheet={JSON.parse(wsKey)} teacher preview />{/key}
        </div>
      {/if}
    </section>
  </main>

  <dialog bind:this={dialog} class="ed">
    <form method="dialog" class="dlg">
      <h2>Veröffentlichen</h2>
      <p>
        Die Einheit wird als Datei <code>{lessonPath(lesson.id)}</code> in dein GitHub-Repository geschrieben. Danach baut GitHub
        die Seite neu, und die Änderung ist für alle sichtbar.
      </p>
      {#if problems.length}
        <p class="warn">Es gibt noch {problems.length} {problems.length === 1 ? 'Hinweis' : 'Hinweise'} im Editor. Veröffentlichen geht trotzdem.</p>
      {/if}
      <div class="grid g3">
        <label>Besitzer <input class="field" bind:value={gh.owner} /></label>
        <label>Repository <input class="field" bind:value={gh.repo} /></label>
        <label>Zweig <input class="field" bind:value={gh.branch} /></label>
      </div>
      <label>
        Persönliches Zugriffstoken
        <input class="field" type="password" autocomplete="off" bind:value={gh.token} placeholder="github_pat_…" />
      </label>
      <label class="check"><input type="checkbox" bind:checked={remember} /> Token in diesem Browser merken</label>
      <details>
        <summary>Woher bekomme ich das Token?</summary>
        <ol>
          <li>
            Auf GitHub anmelden und
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">ein „Fine-grained“ Token anlegen</a>.
          </li>
          <li>Bei „Repository access“ nur dieses Repository auswählen.</li>
          <li>Bei „Permissions“ → „Contents“ die Stufe „Read and write“ wählen. Mehr braucht es nicht.</li>
          <li>Token kopieren und hier einfügen. Es wird nur an api.github.com geschickt.</li>
        </ol>
        <p>
          Warum kein „Mit GitHub anmelden“-Knopf? Der bräuchte einen eigenen Server; diese Seite kommt bewusst ohne aus. Ohne Token
          geht es auch: Datei exportieren und im Repository in den Ordner <code>content/einheiten/</code> hochladen.
        </p>
      </details>
      {#if result}
        <p class={result.ok ? 'okmsg' : 'errmsg'} role="status">
          {result.text}
          {#if result.url}<a href={result.url} target="_blank" rel="noopener">Änderung auf GitHub ansehen</a>{/if}
        </p>
      {/if}
      <div class="rowline end">
        {#if gh.token}
          <button type="button" class="btn small ghost" onclick={() => (forgetToken(), (gh.token = ''), (remember = false))}>Token vergessen</button>
        {/if}
        <span style:flex="1"></span>
        <button class="btn" value="cancel">Schließen</button>
        <button type="button" class="btn primary" disabled={busy || !gh.token || !gh.owner || !gh.repo} onclick={publish}>
          {busy ? 'Wird gespeichert …' : 'Jetzt veröffentlichen'}
        </button>
      </div>
    </form>
  </dialog>
{/if}

<style>
  .save {
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 9px;
    border-radius: 999px;
    border: 1px solid rgb(243 239 226 / 45%);
    white-space: nowrap;
  }
  .save.on {
    background: var(--marker);
    color: var(--ink);
    border-color: var(--marker);
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: var(--sheet);
    border-bottom: 1.5px solid var(--ink);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .grow {
    flex: 1;
  }
  .tabs {
    display: inline-flex;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .tabs button {
    border: 0;
    border-right: 1.5px solid var(--ink);
    background: var(--sheet);
    padding: 0 14px;
    min-height: 38px;
    font-weight: 600;
    font-size: 0.93rem;
  }
  .tabs button:last-child {
    border-right: 0;
  }
  .tabs button[aria-selected='true'] {
    background: var(--ink);
    color: var(--sheet);
  }
  .tabs.small button {
    min-height: 32px;
    font-size: 0.86rem;
    padding: 0 11px;
  }
  .split {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 18px;
    max-width: 1800px;
    margin: 0 auto;
  }
  .form {
    display: grid;
    gap: 12px;
    align-content: start;
    min-width: 0;
  }
  .preview {
    display: grid;
    gap: 10px;
    align-content: start;
    min-width: 0;
  }
  .pvhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .hide {
    display: none;
  }
  .problems {
    background: #fff3d6;
    border: 1.5px solid var(--warn);
    border-radius: var(--radius);
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  .problems ul {
    margin: 4px 0 0;
    padding-left: 20px;
  }
  @media (min-width: 1050px) {
    .split {
      grid-template-columns: minmax(380px, 5fr) minmax(0, 6fr);
      align-items: start;
    }
    .preview {
      position: sticky;
      top: 74px;
      max-height: calc(100vh - 90px);
      overflow: auto;
      padding: 0 4px 6px 0;
    }
  }

  dialog {
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    box-shadow: 8px 8px 0 rgb(27 36 51 / 35%);
    padding: 0;
    width: min(600px, calc(100vw - 30px));
    background: var(--sheet);
    color: var(--ink);
  }
  dialog::backdrop {
    background: rgb(18 55 47 / 55%);
  }
  .dlg {
    display: grid;
    gap: 12px;
    padding: 22px;
  }
  .dlg h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .dlg p {
    margin: 0;
    font-size: 0.93rem;
  }
  .dlg details {
    font-size: 0.9rem;
    border: 1.5px dashed var(--line);
    border-radius: var(--radius);
    padding: 8px 12px;
  }
  .dlg summary {
    cursor: pointer;
    font-weight: 600;
  }
  .dlg ol {
    margin: 8px 0;
    padding-left: 20px;
  }
  .warn {
    color: var(--warn);
    font-weight: 600;
  }
  .okmsg {
    background: var(--green-soft);
    border-left: 4px solid var(--green);
    padding: 8px 12px;
  }
  .errmsg {
    background: var(--signal-soft);
    border-left: 4px solid var(--signal);
    padding: 8px 12px;
  }
  .end {
    margin-top: 4px;
  }
</style>
