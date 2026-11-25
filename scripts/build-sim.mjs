/**
 * Baut eine oder alle Simulationen als eigenständige statische Seite.
 *
 *   npm run build:sim -- federpendel      -> dist-sim/federpendel/
 *   npm run build:sim                     -> alle Simulationen
 *
 * Der entstehende Ordner enthält nur diese eine Simulation (index.html +
 * assets/) und kann auf jeden Webserver, in ein LMS (mebis/Moodle) oder auf
 * einen USB-Stick kopiert werden. Mit ?embed in der Adresse entfällt die
 * Kopfzeile, praktisch zum Einbetten per <iframe>.
 *
 * Die Einstiegsdateien werden hier erzeugt; es muss also nichts von Hand
 * angelegt werden, wenn eine Simulation dazukommt.
 */
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// Verzeichnis der Simulationen aus src/sims/index.ts lesen: import { sim as name } from './pfad';
const index = readFileSync(resolve(root, 'src/sims/index.ts'), 'utf8');
const entries = [...index.matchAll(/import \{ sim as \w+ \} from '\.\/([^']+)';/g)].map((m) => m[1]);
const all = {};
for (const file of entries) {
  const src = readFileSync(resolve(root, 'src/sims', `${file}.ts`), 'utf8');
  const id = src.match(/\bid: '([^']+)'/)?.[1];
  const title = src.match(/\btitle: '([^']+)'/)?.[1] ?? id;
  if (id) all[id] = { file, title };
}

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(all);
for (const name of names) {
  if (!all[name]) {
    console.error(`Unbekannte Simulation „${name}“. Verfügbar: ${Object.keys(all).join(', ')}`);
    process.exit(1);
  }
}

process.env.VITE_STANDALONE = '1';
const tmp = resolve(root, '.sim-build');

for (const name of names) {
  const dir = resolve(tmp, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, 'index.html'),
    `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#12372f" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <title>${all[name].title} · Physik-Workspace</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
`
  );
  writeFileSync(
    resolve(dir, 'main.ts'),
    `import { mount } from 'svelte';
import '../../src/styles/global.css';
import Standalone from '../../src/pages/Standalone.svelte';
import { sim } from '../../src/sims/${all[name].file}';

mount(Standalone, { target: document.getElementById('app')!, props: { def: sim } });
`
  );
  await build({
    configFile: false,
    root: dir,
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
rmSync(tmp, { recursive: true, force: true });
