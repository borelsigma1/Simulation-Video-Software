/**
 * Farben und Schriften für Canvas-Zeichnungen: Tusche auf hellem Papier,
 * kontrastreich genug für den Beamer. Die Physik-Farbkonventionen bleiben über
 * alle Simulationen gleich (Geschwindigkeit immer blau, Kraft immer rot …).
 */
export const theme = {
  font: '"Atkinson Hyperlegible Next Variable", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, Consolas, monospace',
  bg: '#fffdf7',
  grid: '#ece6d6',
  gridStrong: '#d6cdb8',
  axis: '#4d5766',
  text: '#1b2433',
  muted: '#69717e',
  ground: '#7d8f55',
  groundFill: '#eef0dc',
  object: '#e2572b',
  objectDark: '#a53a17',
  velocity: '#1d5fbf',
  velocityX: '#3c95dd',
  velocityY: '#7a55c7',
  force: '#cf2f3c',
  acceleration: '#1f8a5b',
  trail: '#e2572b',
  prediction: '#a3a79f',
  spring: '#3d4654',
  metal: '#cdd2d9',
  metalDark: '#8b95a3',
  light: '#f0a90c',
  lightSoft: '#fde9a8',
  glass: '#c6e2ee',
  water: '#a8d3ea',
  waterDark: '#4a93bd',
  plus: '#cf2f3c',
  minus: '#1d5fbf',
  green: '#0e5a4b'
} as const;

/** Farben für Diagrammkurven (passend zu den Pfeilfarben oben). */
export const seriesColors = ['#e2572b', '#1d5fbf', '#1f8a5b', '#7a55c7', '#cf2f3c'];
