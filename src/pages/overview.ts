import { mount } from 'svelte';
import '../styles/global.css';
import Overview from './Overview.svelte';

mount(Overview, { target: document.getElementById('app')! });
