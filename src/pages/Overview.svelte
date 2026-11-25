<script lang="ts">
  const lessons = [
    {
      href: 'lektionen/federpendel/',
      title: 'Federpendel: Periodendauer untersuchen',
      text: 'Lernvideo, Simulation und Arbeitsblatt mit Messwerttabelle und PDF-Export.',
      level: 'Klasse 10'
    }
  ];
  const sims = [
    {
      href: 'sims/schiefer-wurf/',
      title: 'Schiefer Wurf',
      text: 'Abwurfwinkel, Geschwindigkeit und Höhe variieren, Bahnkurven vergleichen, Geschwindigkeitskomponenten sehen.',
      level: 'Klasse 10/11'
    },
    {
      href: 'sims/federpendel/',
      title: 'Federpendel',
      text: 'Masse, Federkonstante und Dämpfung einstellen, Periodendauer messen, s(t), v(t), a(t) und Energien.',
      level: 'Klasse 10/11'
    }
  ];
</script>

<header class="page-header">
  <h1>Physik-Workspace</h1>
</header>

<main>
  <p class="lead">
    Simulationen, Arbeitsblätter und Lernvideos für den Physikunterricht. Alles läuft direkt im Browser, auch auf dem
    Tablet. Es werden keine Daten gespeichert.
  </p>

  <h2>Lerneinheiten</h2>
  <ul class="grid">
    {#each lessons as l (l.href)}
      <li>
        <a class="card tile lesson" href={l.href}>
          <span class="tag">{l.level}</span>
          <strong>{l.title}</strong>
          <span class="muted">{l.text}</span>
        </a>
      </li>
    {/each}
  </ul>

  <h2>Simulationen</h2>
  <ul class="grid">
    {#each sims as s (s.href)}
      <li>
        <a class="card tile" href={s.href}>
          <span class="tag">{s.level}</span>
          <strong>{s.title}</strong>
          <span class="muted">{s.text}</span>
        </a>
      </li>
    {/each}
  </ul>
</main>

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px;
  }
  .lead {
    font-size: 1.05rem;
    max-width: 65ch;
    margin: 4px 0 24px;
  }
  h2 {
    font-size: 1.1rem;
    margin: 24px 0 10px;
  }
  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    padding: 16px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s, transform 0.15s;
  }
  .tile:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  .tile strong {
    font-size: 1.05rem;
  }
  .tile .muted {
    font-size: 0.92rem;
  }
  .lesson {
    border-left: 4px solid var(--accent);
  }
  .tag {
    align-self: flex-start;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 999px;
    padding: 2px 8px;
  }
</style>
