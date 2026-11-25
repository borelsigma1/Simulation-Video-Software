import { mount } from 'svelte';
import '../../styles/global.css';
import LessonLayout from '../../lib/LessonLayout.svelte';
import Federpendel from '../../sims/federpendel/Federpendel.svelte';
import { arbeitsblatt } from './arbeitsblatt';
import { lessonTitle, video } from './lesson';

mount(LessonLayout, {
  target: document.getElementById('app')!,
  props: { title: lessonTitle, sim: Federpendel, video, worksheet: arbeitsblatt }
});
