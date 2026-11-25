<!-- Hauptmenü: Jahrgangsstufe auf der Messskala wählen, darunter die Lerneinheiten. -->
<script lang="ts">
  import { published } from '../lib/content/store.svelte';
  import { DOMAINS, GRADES } from '../lib/content/types';
  import { href, router } from '../lib/router.svelte';
  import SimThumb from '../lib/sim/SimThumb.svelte';
  import { simById } from '../sims';

  let { grade }: { grade?: number } = $props();

  const firstWithContent = GRADES.find((g) => published.some((l) => l.grade === g)) ?? 7;
  const current = $derived((GRADES as readonly number[]).includes(grade ?? -1) ? (grade as number) : firstWithContent);
  const lessons = $derived(published.filter((l) => l.grade === current));
  const count = (g: number) => published.filter((l) => l.grade === g).length;

  const stufe: Record<number, string> = {
    7: 'Natur und Technik, Schwerpunkt Physik',
    8: 'Physik',
    9: 'Physik',
    10: 'Physik',
    11: 'Physik, Einführungsphase',
    12: 'Physik, Qualifikationsphase',
    13: 'Physik, Qualifikationsphase'
  };

  function key(e: KeyboardEvent) {
    const i = GRADES.indexOf(current as (typeof GRADES)[number]);
    if (e.key === 'ArrowRight' && i < GRADES.length - 1) router.go(`klasse/${GRADES[i + 1]}`);
    if (e.key === 'ArrowLeft' && i > 0) router.go(`klasse/${GRADES[i - 1]}`);
  }
</script>

<header class="board">
  <div class="wrap">
    <div class="brand">
      <svg class="logo" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M6 48h52" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        <path d="M10 48v-7m10.5 7V36M31 48v-7m10.5 7V36M52 48v-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <path d="M31 8l9 16H22z" fill="var(--signal)" />
      </svg>
      <span class="name">Physik<span class="thin">Workspace</span></span>
      <a class="teacher" href={href('lehrkraft')}>Für Lehrkräfte</a>
    </div>

    <h1>Welche Jahrgangsstufe?</h1>
    <p class="lead">Zu jedem Thema gibt es eine Simulation zum Ausprobieren und ein Arbeitsblatt, das du direkt hier ausfüllst.</p>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <nav class="ruler" aria-label="Jahrgangsstufe" onkeydown={key}>
      {#each GRADES as g (g)}
        <a class="tick" class:active={g === current} class:empty={count(g) === 0} href={href(`klasse/${g}`)} aria-current={g === current ? 'page' : undefined}>
          <span class="reiter" aria-hidden="true"></span>
          <span class="num">{g}</span>
          <span class="visually-hidden">. Jahrgangsstufe, {count(g)} Einheiten</span>
        </a>
      {/each}
    </nav>
  </div>
</header>

<main class="wrap">
  <section class="grade">
    <div class="big" aria-hidden="true">{current}</div>
    <div class="info">
      <p class="eyebrow">Jahrgangsstufe {current}</p>
      <h2>{stufe[current]}</h2>
      <p class="muted">
        {#if lessons.length}
          {lessons.length} {lessons.length === 1 ? 'Lerneinheit' : 'Lerneinheiten'} nach LehrplanPLUS Gymnasium Bayern
        {:else}
          Für diese Jahrgangsstufe sind die Lerneinheiten noch in Arbeit.
        {/if}
      </p>
    </div>
  </section>

  <ul class="cards">
    {#each lessons as l, i (l.id)}
      {@const def = simById(l.sim.id)}
      <li class="card sheet" style:--d={`var(--d-${l.domain})`}>
        <a class="main" href={href(`einheit/${l.id}`)}>
          <div class="thumb">
            {#if def}<SimThumb {def} config={l.sim} />{/if}
            <span class="index">{current}.{i + 1}</span>
          </div>
          <div class="txt">
            <p class="eyebrow dom"><span class="dot"></span>{DOMAINS[l.domain]}</p>
            <h3>{l.title}</h3>
            <p class="sum">{l.summary}</p>
            <p class="eyebrow cur">{l.curriculum}</p>
          </div>
        </a>
        <div class="actions">
          <a class="go" href={href(`einheit/${l.id}`)}>Lerneinheit öffnen <span aria-hidden="true">→</span></a>
          <a class="only" href={href(`einheit/${l.id}/sim`)}>nur Simulation</a>
        </div>
      </li>
    {/each}
  </ul>
</main>

<footer class="wrap foot">
  <p>
    Alles läuft direkt im Browser, auch auf dem Tablet. Es werden keine Daten von Schülerinnen und Schülern gespeichert oder
    übertragen; das ausgefüllte Arbeitsblatt lädst du als PDF herunter.
  </p>
</footer>

<style>
  .wrap {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 22px;
  }
  .board {
    background-color: var(--board);
    background-image:
      linear-gradient(rgb(243 239 226 / 5%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(243 239 226 / 5%) 1px, transparent 1px);
    background-size: 22px 22px;
    color: var(--chalk);
    padding: 18px 0 0;
    border-bottom: 4px solid var(--board-2);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo {
    width: 34px;
    height: 34px;
  }
  .name {
    font-family: var(--display);
    font-weight: 800;
    font-size: 1.3rem;
    letter-spacing: -0.02em;
  }
  .thin {
    font-weight: 300;
    margin-left: 0.18em;
  }
  .teacher {
    margin-left: auto;
    color: var(--chalk);
    font-family: var(--mono);
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-decoration: none;
    border: 1px solid rgb(243 239 226 / 45%);
    border-radius: var(--radius);
    padding: 7px 11px;
  }
  .teacher:hover {
    background: rgb(243 239 226 / 12%);
  }
  h1 {
    font-size: clamp(2.2rem, 6vw, 4rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    margin: 42px 0 8px;
  }
  .lead {
    max-width: 52ch;
    margin: 0 0 30px;
    font-size: 1.08rem;
    color: rgb(243 239 226 / 82%);
  }

  /* Messskala: ein Lineal mit den Jahrgangsstufen als Hauptteilstrichen */
  .ruler {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background-color: #f6e7b4;
    /* feine und mittlere Teilstriche am oberen Rand */
    background-image:
      repeating-linear-gradient(90deg, var(--ink) 0 1.5px, transparent 1.5px calc(100% / 14)),
      repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px calc(100% / 70));
    background-size:
      100% 16px,
      100% 9px;
    background-repeat: no-repeat;
    background-position: calc(100% / 14) 0;
    color: var(--ink);
    border: 2px solid var(--ink);
    border-bottom: 0;
    border-radius: 6px 6px 0 0;
    margin-bottom: -4px;
    position: relative;
  }
  .tick {
    position: relative;
    display: grid;
    justify-items: center;
    padding: 26px 0 10px;
    text-decoration: none;
    color: var(--ink);
  }
  .tick::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 2.5px;
    height: 24px;
    margin-left: -1px;
    background: var(--ink);
  }
  .num {
    font-family: var(--display);
    font-weight: 800;
    font-size: clamp(1.5rem, 4.4vw, 2.5rem);
    line-height: 1;
    letter-spacing: -0.03em;
    padding: 4px 10px 6px;
    border-radius: 4px;
    transition: transform 0.12s;
  }
  .tick:hover .num {
    transform: translateY(-2px);
  }
  .tick.empty .num {
    opacity: 0.45;
  }
  .tick.active .num {
    background: var(--ink);
    color: #f6e7b4;
    opacity: 1;
  }
  .reiter {
    position: absolute;
    top: -15px;
    left: 50%;
    margin-left: -11px;
    border: 11px solid transparent;
    border-top: 15px solid var(--signal);
    border-bottom: 0;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .tick.active .reiter {
    opacity: 1;
  }

  .grade {
    display: flex;
    align-items: center;
    gap: clamp(14px, 3vw, 30px);
    margin: 34px 0 22px;
  }
  .big {
    font-family: var(--display);
    font-weight: 800;
    font-size: clamp(5.5rem, 15vw, 10rem);
    line-height: 0.8;
    letter-spacing: -0.06em;
    color: var(--sheet);
    -webkit-text-stroke: 2.5px var(--ink);
    text-shadow: 6px 6px 0 var(--signal);
    padding-right: 8px;
  }
  .info h2 {
    font-size: clamp(1.4rem, 3.4vw, 2.1rem);
    margin: 4px 0 6px;
  }
  .info p {
    margin: 0;
  }

  .cards {
    list-style: none;
    padding: 0;
    margin: 0 0 40px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 22px;
  }
  .card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-top: 6px solid var(--d);
    transition:
      transform 0.12s,
      box-shadow 0.12s;
  }
  .card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--line);
  }
  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    text-decoration: none;
    color: inherit;
  }
  .thumb {
    position: relative;
    border-bottom: 1.5px solid var(--ink);
    background: var(--sheet);
  }
  .index {
    position: absolute;
    left: 0;
    bottom: 0;
    font-family: var(--mono);
    font-weight: 600;
    font-size: 0.8rem;
    background: var(--ink);
    color: var(--sheet);
    padding: 3px 9px;
    border-top-right-radius: 4px;
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px 12px;
    flex: 1;
  }
  .txt p {
    margin: 0;
  }
  .dom {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--d);
    font-weight: 600;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--d);
  }
  .card h3 {
    font-size: 1.32rem;
    margin: 0;
  }
  .sum {
    font-size: 0.95rem;
    color: var(--ink-2);
    flex: 1;
  }
  .cur {
    padding-top: 8px;
    border-top: 1px dashed var(--line);
    text-transform: none;
    letter-spacing: 0.01em;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    border-top: 1.5px solid var(--ink);
    background: var(--sheet-2);
  }
  .go {
    font-weight: 700;
    text-decoration: none;
    color: var(--ink);
  }
  .go span {
    display: inline-block;
    transition: transform 0.12s;
    color: var(--signal);
  }
  .card:hover .go span {
    transform: translateX(4px);
  }
  .only {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .foot {
    padding-bottom: 36px;
    font-size: 0.86rem;
    color: var(--muted);
    max-width: 1180px;
  }
  .foot p {
    max-width: 70ch;
    border-top: 1.5px solid var(--ink);
    padding-top: 12px;
  }
  @media (max-width: 560px) {
    .teacher {
      font-size: 0.68rem;
      padding: 6px 8px;
    }
    h1 {
      margin-top: 28px;
    }
  }
</style>
