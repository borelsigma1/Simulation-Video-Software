import type { LessonVideo } from '../../lib/video/types';

export const lessonTitle = 'Federpendel: Periodendauer untersuchen';

/**
 * Lernvideo zur Einheit. Sobald ein Video existiert, hier eintragen, z. B.
 *   source: { kind: 'file', src: 'videos/federpendel.mp4' }      // Datei in public/videos/
 *   source: { kind: 'youtube', id: 'VIDEO_ID' }                   // lädt erst nach Klick
 */
export const video: LessonVideo = {
  title: 'Wie schwingt ein Federpendel?',
  source: { kind: 'none' }
};
