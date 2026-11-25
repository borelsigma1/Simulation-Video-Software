import { mount } from 'svelte';
import '../../styles/global.css';
import SimPage from '../../lib/SimPage.svelte';
import SchieferWurf from './SchieferWurf.svelte';

mount(SimPage, {
  target: document.getElementById('app')!,
  props: { title: 'Schiefer Wurf', sim: SchieferWurf, standalone: import.meta.env.VITE_STANDALONE === '1' }
});
