/**
 * Farben für Canvas-Zeichnungen. Bewusst kontrastreich, damit alles auch am
 * Beamer gut lesbar ist. Die Physik-Farbkonventionen bleiben über alle
 * Simulationen gleich (z. B. Geschwindigkeit immer blau, Kraft immer rot).
 */
export const theme = {
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  bg: '#ffffff',
  grid: '#e8ecf2',
  gridStrong: '#cfd6e0',
  axis: '#5b6573',
  text: '#1f2933',
  muted: '#6b7785',
  ground: '#8a9a5b',
  object: '#e0712c',
  objectDark: '#a84f17',
  velocity: '#1f6fd1',
  velocityX: '#3fa0e8',
  velocityY: '#7a5cd6',
  force: '#d33a3a',
  acceleration: '#2b9a66',
  trail: '#e0712c',
  prediction: '#9aa5b1',
  spring: '#4a5563'
} as const;

/** Farben für Diagrammkurven (passend zu den Pfeilfarben oben). */
export const seriesColors = ['#e0712c', '#1f6fd1', '#2b9a66', '#7a5cd6', '#d33a3a'];
