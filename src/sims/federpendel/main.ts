import { mount } from 'svelte';
import '../../styles/global.css';
import SimPage from '../../lib/SimPage.svelte';
import Federpendel from './Federpendel.svelte';

mount(SimPage, {
  target: document.getElementById('app')!,
  props: { title: 'Federpendel', sim: Federpendel, standalone: import.meta.env.VITE_STANDALONE === '1' }
});
