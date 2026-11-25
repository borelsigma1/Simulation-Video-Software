/**
 * Baut eine oder alle Simulationen als eigenständige statische Seite.
 *
 *   npm run build:sim -- federpendel      -> dist-sim/federpendel/
 *   npm run build:sim                     -> alle Simulationen
 *
 * Der entstehende Ordner enthält nur diese eine Simulation (index.html +
 * assets/) und kann auf jeden Webserver, in ein LMS (Moodle, …) oder auf
 * einen USB-Stick kopiert werden. Mit ?embed in der URL entfällt die
 * Kopfzeile, praktisch zum Einbetten per <iframe>.
 */
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const all = readdirSync(resolve(root, 'sims'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(resolve(root, 'sims', d.name, 'index.html')))
  .map((d) => d.name);

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : all;

for (const name of names) {
  if (!all.includes(name)) {
    console.error(`Unbekannte Simulation „${name}“. Verfügbar: ${all.join(', ')}`);
    process.exit(1);
  }
}

process.env.VITE_STANDALONE = '1';

for (const name of names) {
  const simRoot = resolve(root, 'sims', name);
  await build({
    configFile: false,
    root: simRoot,
    base: './',
    publicDir: resolve(root, 'public'),
    envDir: root,
    logLevel: 'warn',
    plugins: [svelte({ configFile: resolve(root, 'svelte.config.js') })],
    build: {
      target: 'es2022',
      outDir: resolve(root, 'dist-sim', name),
      emptyOutDir: true
    }
  });
  console.log(`✓ dist-sim/${name}/`);
}
