/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Eine einzige statische Seite; die Navigation läuft über den Teil der
 * Adresse hinter dem # (siehe src/lib/router.svelte.ts).
 *
 * `base: './'` sorgt für relative Pfade. Dadurch läuft der Build unter
 * GitHub Pages (Unterordner), in der späteren Capacitor-App und auch,
 * wenn man den Ordner einfach auf einen anderen Webserver kopiert.
 */
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts']
  }
});
