/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

/**
 * Mehrseitiger Build: Jede Seite ist eine eigene statische HTML-Datei.
 *  - index.html                     Übersicht
 *  - lektionen/<name>/index.html    Lerneinheit (Video + Simulation + Arbeitsblatt)
 *  - sims/<name>/index.html         einzelne Simulation
 *
 * `base: './'` sorgt für relative Pfade. Dadurch läuft der Build unter
 * GitHub Pages (Unterordner), in der späteren Capacitor-App und auch,
 * wenn man einen Ordner einfach auf einen anderen Webserver kopiert.
 */
const pages = {
  main: 'index.html',
  'lektion-federpendel': 'lektionen/federpendel/index.html',
  'sim-schiefer-wurf': 'sims/schiefer-wurf/index.html',
  'sim-federpendel': 'sims/federpendel/index.html'
};

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(pages).map(([name, file]) => [name, resolve(import.meta.dirname, file)])
      )
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
