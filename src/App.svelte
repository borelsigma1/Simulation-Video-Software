<script lang="ts">
  import { router } from './lib/router.svelte';
  import Home from './pages/Home.svelte';
  import LessonPage from './pages/LessonPage.svelte';
  import SimPage from './pages/SimPage.svelte';
  import Teacher from './pages/Teacher.svelte';
  import Editor from './pages/Editor.svelte';

  const p = $derived(router.parts);
</script>

{#if p[0] === 'einheit' && p[1] && p[2] === 'sim'}
  {#key p[1]}<SimPage lessonId={p[1]} />{/key}
{:else if p[0] === 'einheit' && p[1]}
  {#key p[1]}<LessonPage id={p[1]} />{/key}
{:else if p[0] === 'sim' && p[1]}
  {#key p[1]}<SimPage simId={p[1]} />{/key}
{:else if p[0] === 'lehrkraft' && p[1] === 'vorschau' && p[2]}
  {#key p[2]}<LessonPage id={p[2]} teacher />{/key}
{:else if p[0] === 'lehrkraft' && p[1]}
  {#key p[1]}<Editor id={p[1]} />{/key}
{:else if p[0] === 'lehrkraft'}
  <Teacher />
{:else}
  <Home grade={p[0] === 'klasse' ? Number(p[1]) : undefined} />
{/if}
