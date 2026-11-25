/**
 * Quelle eines Lernvideos.
 *  - file:    eigene Videodatei (z. B. public/videos/federpendel.mp4) – datenschutzfreundlichste Variante
 *  - youtube: YouTube-Video, wird erst nach Klick geladen (Zwei-Klick-Lösung, youtube-nocookie.com)
 *  - none:    Platzhalter, solange es noch kein Video gibt
 */
export type VideoSource =
  | { kind: 'file'; src: string; poster?: string; captions?: string }
  | { kind: 'youtube'; id: string; start?: number }
  | { kind: 'none' };

export interface LessonVideo {
  title: string;
  source: VideoSource;
}
