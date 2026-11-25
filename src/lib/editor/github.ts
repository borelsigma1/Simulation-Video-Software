/**
 * Lerneinheit direkt ins GitHub-Repository schreiben.
 *
 * Die Seite ist rein statisch, es gibt keinen eigenen Server. Deshalb läuft
 * die Anmeldung über ein persönliches Zugriffstoken, das nur im Speicher
 * dieses Browsers liegt und ausschließlich an api.github.com geschickt wird.
 */
import type { Lesson } from '../content/types';

export interface GithubSettings {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

const KEY = 'physik-workspace:github';
export const DEFAULT_REPO = { owner: 'borelsigma1', repo: 'Simulation-Video-Software', branch: 'main' };

export function loadSettings(): GithubSettings {
  try {
    return { ...DEFAULT_REPO, token: '', ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_REPO, token: '' };
  }
}
export function saveSettings(s: GithubSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
export function forgetToken(): void {
  const s = loadSettings();
  saveSettings({ ...s, token: '' });
}

function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const lessonPath = (id: string) => `content/einheiten/${id}.json`;
export const lessonJson = (l: Lesson) => JSON.stringify(l, null, 2) + '\n';

/** Legt die Datei an oder überschreibt sie. Rückgabe: Adresse des Commits. */
export async function publishLesson(s: GithubSettings, lesson: Lesson): Promise<string> {
  const api = `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}/contents/${lessonPath(lesson.id)}`;
  const headers = {
    Authorization: `Bearer ${s.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const fail = async (r: Response, what: string) => {
    const hint =
      r.status === 401
        ? 'Das Token ist ungültig oder abgelaufen.'
        : r.status === 403 || r.status === 404
          ? 'Das Token hat für dieses Repository keine Schreibrechte (nötig: „Contents: Read and write“), oder Repository/Zweig stimmen nicht.'
          : r.status === 409
            ? 'Die Datei wurde zwischenzeitlich geändert. Bitte noch einmal versuchen.'
            : ((await r.json().catch(() => ({}))) as { message?: string }).message ?? '';
    throw new Error(`${what} fehlgeschlagen (${r.status}). ${hint}`);
  };

  let sha: string | undefined;
  const cur = await fetch(`${api}?ref=${encodeURIComponent(s.branch)}`, { headers, cache: 'no-store' });
  if (cur.ok) sha = ((await cur.json()) as { sha: string }).sha;
  else if (cur.status !== 404) await fail(cur, 'Lesen');

  const put = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Lerneinheit „${lesson.title}“ ${sha ? 'aktualisiert' : 'angelegt'} (Lehrkraft-Modus)`,
      content: base64Utf8(lessonJson(lesson)),
      branch: s.branch,
      sha
    })
  });
  if (!put.ok) await fail(put, 'Speichern');
  const res = (await put.json()) as { commit?: { html_url?: string } };
  return res.commit?.html_url ?? `https://github.com/${s.owner}/${s.repo}`;
}

export function downloadLesson(lesson: Lesson): void {
  const url = URL.createObjectURL(new Blob([lessonJson(lesson)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lesson.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
