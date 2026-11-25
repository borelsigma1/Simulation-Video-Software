import type { Worksheet } from '../../lib/worksheet/types';

export const arbeitsblatt: Worksheet = {
  title: 'Das Federpendel',
  subtitle: 'Mechanische Schwingungen · Klasse 10',
  blocks: [
    { type: 'heading', text: 'Wovon hängt die Periodendauer ab?' },
    {
      type: 'text',
      text: `Ein Körper hängt an einer Schraubenfeder. Lenkt man ihn aus der Ruhelage aus und lässt ihn los,
schwingt er auf und ab. Die Zeit für eine vollständige Hin- und Herbewegung heißt **Periodendauer T**.

Die Simulation misst T automatisch, sobald das Pendel einige Schwingungen ausgeführt hat.`
    },
    {
      type: 'question',
      id: 'vermutung',
      prompt:
        'Stelle eine Vermutung auf: Wie ändert sich T, wenn du die Masse vergrößerst? Wie, wenn du eine härtere Feder (größeres D) verwendest?',
      lines: 3
    },

    { type: 'heading', text: 'Versuch 1: Abhängigkeit von der Masse' },
    {
      type: 'text',
      text: `Stelle die Federkonstante auf **D = 20 N/m** und die Dämpfung auf **b = 0**. Miss die Periodendauer
für mindestens fünf verschiedene Massen. Warte jeweils, bis T angezeigt wird, und tippe dann auf
**Messwerte übernehmen**. Die Spalte T² berechnest du selbst.`
    },
    {
      type: 'table',
      id: 'masse',
      columns: [
        { key: 'm', label: 'm', unit: 'kg', source: 'm' },
        { key: 'T', label: 'T', unit: 's', source: 'T' },
        { key: 'T2', label: 'T²', unit: 's²' },
        { key: 'q', label: 'T²/m', unit: 's²/kg' }
      ],
      rows: 5
    },
    {
      type: 'choice',
      id: 'aussage-m',
      prompt: 'Welche Aussage passt zu deinen Messwerten?',
      options: [
        'Je größer die Masse, desto kleiner die Periodendauer.',
        'Die Periodendauer ist proportional zur Masse (T ~ m).',
        'Das Quadrat der Periodendauer ist proportional zur Masse (T² ~ m).',
        'Die Periodendauer hängt nicht von der Masse ab.'
      ]
    },

    { type: 'heading', text: 'Versuch 2: Abhängigkeit von der Federkonstante' },
    {
      type: 'text',
      text: 'Stelle nun eine feste Masse ein (z. B. **m = 0,5 kg**) und verändere die Federkonstante D.'
    },
    {
      type: 'table',
      id: 'feder',
      columns: [
        { key: 'D', label: 'D', unit: 'N/m', source: 'D' },
        { key: 'T', label: 'T', unit: 's', source: 'T' },
        { key: 'T2', label: 'T²', unit: 's²' },
        { key: 'p', label: 'T²·D', unit: 's²·N/m' }
      ],
      rows: 5
    },
    {
      type: 'question',
      id: 'auswertung-d',
      prompt: 'Beschreibe den Zusammenhang zwischen D und T. Begründe mit deinen Messwerten.',
      lines: 3
    },

    { type: 'heading', text: 'Versuch 3: Spielt die Auslenkung eine Rolle?' },
    {
      type: 'choice',
      id: 'amplitude',
      prompt: 'Verändere die Startauslenkung bei sonst gleichen Einstellungen. Ändert sich die Periodendauer?',
      options: ['Ja, bei größerer Auslenkung wird T größer.', 'Ja, bei größerer Auslenkung wird T kleiner.', 'Nein, T bleibt gleich.']
    },
    {
      type: 'snapshot',
      id: 'bild',
      prompt: 'Füge eine Momentaufnahme der Simulation ein, auf der die Kraft- und Geschwindigkeitspfeile zu sehen sind.'
    },
    {
      type: 'question',
      id: 'pfeile',
      prompt: 'Wo ist der Betrag der Geschwindigkeit am größten, wo die rücktreibende Kraft? Erkläre.',
      lines: 3
    },

    { type: 'heading', text: 'Zusatzaufgabe' },
    {
      type: 'question',
      id: 'formel',
      prompt:
        'Fasse deine Ergebnisse in einer Formel für T zusammen. Bestimme den Proportionalitätsfaktor aus deinen Messwerten und vergleiche mit 2·π.',
      lines: 4
    }
  ]
};
