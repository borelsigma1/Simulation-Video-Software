/**
 * Kleine Navigation über den Teil der Adresse hinter dem #.
 * Funktioniert ohne Serverkonfiguration auf GitHub Pages, in einem iframe
 * (mebis/Moodle) und später in der App.
 *
 *   #/                     Übersicht
 *   #/klasse/8             Übersicht, Jahrgangsstufe 8 gewählt
 *   #/einheit/<id>         Lerneinheit
 *   #/einheit/<id>/sim     nur die Simulation der Einheit (?embed: ohne Kopfzeile)
 *   #/sim/<id>             Simulation mit allen Reglern
 *   #/lehrkraft            Lehrkraft-Modus
 *   #/lehrkraft/<id>       Editor
 */
function parse(): { parts: string[]; query: URLSearchParams } {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, q = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
}

class Router {
  current = $state.raw(parse());
  constructor() {
    window.addEventListener('hashchange', () => {
      this.current = parse();
      window.scrollTo(0, 0);
    });
  }
  get parts(): string[] {
    return this.current.parts;
  }
  get embed(): boolean {
    return this.current.query.has('embed') || new URLSearchParams(location.search).has('embed');
  }
  go(path: string): void {
    location.hash = '#/' + path.replace(/^\//, '');
  }
}

export const router = new Router();
export const href = (path: string): string => '#/' + path.replace(/^\//, '');
