<script lang="ts">
  import type { LessonVideo } from './types';

  let { video }: { video: LessonVideo } = $props();
  let consent = $state(false);
  const base = import.meta.env.BASE_URL;
  const url = (p: string) => (/^(https?:)?\/\//.test(p) ? p : base + p.replace(/^\//, ''));
</script>

<details class="video sheet" open>
  <summary>
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
      ><rect x="2" y="5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2" /><path
        d="M17 10l5-3v10l-5-3z"
        fill="currentColor"
      /></svg
    >
    Lernvideo: {video.title}
  </summary>

  <div class="frame">
    {#if video.source.kind === 'file'}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video controls preload="metadata" playsinline poster={video.source.poster ? url(video.source.poster) : undefined}>
        <source src={url(video.source.src)} />
        {#if video.source.captions}
          <track kind="captions" srclang="de" label="Deutsch" src={url(video.source.captions)} default />
        {/if}
      </video>
    {:else if video.source.kind === 'youtube'}
      {#if consent}
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.source.id)}?rel=0${video.source.start ? `&start=${video.source.start}` : ''}&autoplay=1`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      {:else}
        <div class="placeholder">
          <p>Dieses Video wird von YouTube geladen. Dabei werden Daten (z. B. deine IP-Adresse) an YouTube übertragen.</p>
          <button class="btn primary" onclick={() => (consent = true)}>Video laden</button>
        </div>
      {/if}
    {:else}
      <div class="placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"
          ><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" /><path
            d="M10 8l6 4-6 4z"
            fill="currentColor"
          /></svg
        >
        <p><b>Hier erscheint das Lernvideo.</b></p>
        <p class="muted small">
          Für Lehrkräfte: Video in der Lerneinheit eintragen (eigene Datei in <code>public/videos/</code> oder
          YouTube-ID).
        </p>
      </div>
    {/if}
  </div>
</details>

<style>
  .video {
    overflow: hidden;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: '▾';
    margin-left: auto;
    color: var(--muted);
  }
  details:not([open]) summary::after {
    content: '▸';
  }
  .frame {
    aspect-ratio: 16 / 9;
    background: #10151c;
  }
  video,
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
  .placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    text-align: center;
    color: #dfe5ec;
  }
  .placeholder p {
    margin: 0;
    max-width: 44ch;
  }
  .placeholder .muted {
    color: #9aa7b5;
  }
  .small {
    font-size: 0.85rem;
  }
  code {
    font-family: var(--mono);
    font-size: 0.9em;
  }
</style>
