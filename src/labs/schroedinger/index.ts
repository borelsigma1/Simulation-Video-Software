/**
 * Schrödinger-Labor im Physik-Workspace.
 *
 * Zwei Labore aus Sepps Artefakten:
 *  - „1d“: stationäre Schrödingergleichung in sieben Potenzialen
 *    (Töpfe, Oszillator, Coulomb, Doppel- und Mehrfachtopf, Barriere),
 *  - „coulomb“: Wasserstoffatom mit radialer Welle, Ebene und Orbital in 3D.
 *
 * Beide laufen in einem Shadow-DOM, damit ihre Gestaltung und die des Workspace
 * sich nicht gegenseitig stören. Farben, Schriften und Rahmen kommen aus dem
 * Workspace (Tusche auf Papier, Zinnober für alles, was man anfasst).
 */
import katexCss from 'katex/dist/katex.min.css?inline';
import { initCoulomb } from './coulomb.js';
import { init1D } from './lab1d.js';
import { CSS_1D, CSS_COULOMB, HTML_1D, HTML_COULOMB } from './markup.js';
import type { LabInstance } from '../../lib/sim/types';

/** Farben als feste Hex-Werte: Das Labor rechnet für die Zeichnungen damit. */
const THEME = `
:host{
  --bg:transparent; --surface:#fffdf7; --surface-2:#f8f4ea; --plot:#fffdf7;
  --ink:#1b2433; --muted:#69717e; --rule:#d2c9b5; --grid:#ece6d6; --line:#d2c9b5;
  --psi:#1d5fbf; --neg:#b98509; --prob:#e2572b; --pot:#1b2433; --pot-fill:#ece6d6; --sheet:#e4dccb;
  --energy:#c0303a; --level:#0e5a4b; --cent:#7a3fb0; --im:#7a55c7;
  --ok:#1f8a5b; --ok-bg:#dcebe4; --bad:#c0303a; --bad-bg:#fbe3da;
  --warn:#8a5a0c; --warn-bg:#fdf1cf; --info:#1d5fbf; --info-bg:#e3ecf8; --scrim:rgba(27,36,51,.5);
  --signal:#e2452b; --signal-dark:#b9321c; --marker:#ffe566;
  --sans:"Atkinson Hyperlegible Next Variable","Segoe UI",system-ui,sans-serif;
  --display:"Bricolage Grotesque Variable","Atkinson Hyperlegible Next Variable",system-ui,sans-serif;
  --mono:"JetBrains Mono Variable",ui-monospace,Consolas,monospace;
  --math:"STIX Two Text","Cambria Math",Cambria,Georgia,serif;
  color-scheme:light;
}`;

/** Angleichung an die Bedienelemente des Workspace (wird nach dem Labor-CSS geladen). */
const SKIN = `
[hidden]{display:none!important}
.wrap{padding:0!important;max-width:none!important;gap:12px!important}
.top h1{display:none}
.top{align-items:center}
.lede{color:var(--ink);max-width:72ch}
.tise{background:var(--surface);border:1.5px solid var(--ink);border-left:5px solid var(--energy);border-radius:5px;box-shadow:3px 3px 0 var(--line)}
.stage,.card,.mathsec{border:1.5px solid var(--ink)!important;border-radius:5px!important;box-shadow:3px 3px 0 var(--line)}
.views > #qcard{box-shadow:none}
.cvwrap{border-color:var(--rule)}
.vtitle,.elabel,.card h2{font-family:var(--mono);letter-spacing:.07em;font-weight:600}
.vtitle b{background:var(--ink)}
h3{font-family:var(--display)}
#mathBtn{font-family:var(--display);font-weight:700}
.btn{border:1.5px solid var(--ink);background:var(--surface);border-radius:5px;box-shadow:2px 2px 0 var(--line);font-weight:600;min-height:34px;color:var(--ink)}
.btn:hover{background:var(--surface-2);border-color:var(--ink)}
.btn:active{transform:translate(2px,2px);box-shadow:none}
.btn.primary{background:var(--signal);border-color:var(--signal-dark);color:#fff;box-shadow:2px 2px 0 var(--signal-dark)}
.btn.primary:disabled{background:var(--surface-2);border-color:var(--rule);color:var(--muted);box-shadow:none}
.fine .btn{min-height:30px}
.tabs button{border:1.5px solid var(--ink);background:var(--surface);color:var(--ink);border-radius:5px;box-shadow:2px 2px 0 var(--line);font-weight:600}
.tabs button:hover{background:var(--surface-2);border-color:var(--ink)}
.tabs button[aria-selected="true"]{background:var(--ink);color:var(--surface);box-shadow:2px 2px 0 var(--line)}
.seg{border:1.5px solid var(--ink);border-radius:5px;background:var(--surface)}
.seg button + button{border-left:1.5px solid var(--ink)}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.chip{border:1.5px solid var(--rule);background:var(--surface)}
.chip:has(input:checked){border-color:var(--ink)}
.tog,.ori,.lopt{border:1.5px solid var(--ink)}
.lopt{background:var(--surface)}
.sh{border-width:1.5px}
.status{border-radius:5px}
input[type=range]{accent-color:var(--signal)}
.prm input{accent-color:var(--signal)}
#eout{color:var(--energy)}
:focus-visible{outline:3px solid color-mix(in srgb,var(--signal) 55%,transparent)}
.katex{font-size:1.05em}
.tise .katex{font-size:1.12em}
dialog{border:1.5px solid var(--ink);border-radius:6px;box-shadow:4px 4px 0 var(--line)}
`;

/** Lebenszyklus: alles, was beim Verlassen der Seite wieder abgebaut werden muss. */
function makeLife() {
  let dead = false;
  const offs: (() => void)[] = [];
  const ros: ResizeObserver[] = [];
  return {
    raf(cb: FrameRequestCallback) {
      if (dead) return 0;
      const id = requestAnimationFrame((t) => {
        if (!dead) cb(t);
      });
      offs.push(() => cancelAnimationFrame(id));
      if (offs.length > 200) offs.splice(0, 150);
      return id;
    },
    ro(cb: ResizeObserverCallback) {
      const r = new ResizeObserver((e, o) => {
        if (!dead) cb(e, o);
      });
      ros.push(r);
      return r;
    },
    on(target: EventTarget, type: string, fn: EventListener) {
      target.addEventListener(type, fn);
      offs.push(() => target.removeEventListener(type, fn));
    },
    kill() {
      dead = true;
      for (const r of ros) r.disconnect();
      for (const f of offs) f();
    }
  };
}

function style(css: string): HTMLStyleElement {
  const s = document.createElement('style');
  s.textContent = css;
  return s;
}

export type LabKind = '1d' | 'coulomb';

/** Startwerte aus der Lerneinheit: welches Potenzial bzw. welcher Reiter zuerst offen ist. */
const POT_ORDER = ['inf', 'fin', 'harm', 'coul', 'dbl', 'multi', 'bar'];

export function mountLab(host: HTMLElement, kind: LabKind, p: Record<string, number>): LabInstance {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '';
  const life = makeLife();
  const skin = () => style(katexCss + SKIN);
  shadow.appendChild(style(THEME + (kind === '1d' ? CSS_1D : CSS_COULOMB)));
  shadow.appendChild(skin());
  const tpl = document.createElement('template');
  tpl.innerHTML = kind === '1d' ? HTML_1D : HTML_COULOMB;
  shadow.appendChild(tpl.content);

  if (kind === '1d') {
    const start = POT_ORDER[Math.round(p.potential ?? 0)] ?? 'inf';
    init1D(shadow, host, { order: POT_ORDER, start, autoSave: false, tabs: true }, life);
  } else {
    initCoulomb(shadow, host, { tab: Math.round(p.reiter ?? 2), styleEl: skin }, life);
  }

  return {
    destroy() {
      life.kill();
      shadow.innerHTML = '';
    },
    snapshot() {
      // die gerade sichtbare Hauptzeichenfläche
      const inner = (shadow.getElementById('lab1d') as HTMLElement | null)?.shadowRoot;
      const visible1d = inner && !(shadow.getElementById('lab1d') as HTMLElement).hidden;
      const cv = (visible1d ? inner.getElementById('cv') : shadow.getElementById('cv')) as HTMLCanvasElement | null;
      return cv ? cv.toDataURL('image/png') : '';
    }
  };
}
