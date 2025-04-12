// Standard tuning from low E to high E
const tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

function getSemitone(note: string): number {
  const noteMap: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const match = note.match(/^([A-G]#?)(\d)$/);

  if (!match) return -1;

  const [, letter, octaveStr] = match;
  const octave = parseInt(octaveStr);
  return octave * 12 + noteMap[letter];
}

/**
 * Find the string and fret for a given note
 * @param note E.g. 'G4'
 * @returns { string: number, fret: number } | null
 */
export function getNotePosition(note: string): { string: number; fret: number } | null {
  const targetSemitone = getSemitone(note);
  for (let stringIdx = 0; stringIdx < tuning.length; stringIdx++) {
    const stringSemitone = getSemitone(tuning[stringIdx]);
    const fret = targetSemitone - stringSemitone;
    if (fret >= 0 && fret <= 12) {
      return { string: stringIdx, fret };
    }
  }
  return null;
}

// Assign a color class for each pitch class
const noteColors: { [key: string]: string } = {
  C: 'bg-red-600',
  'C#': 'bg-pink-600',
  D: 'bg-orange-500',
  'D#': 'bg-yellow-500',
  E: 'bg-lime-500',
  F: 'bg-green-500',
  'F#': 'bg-teal-500',
  G: 'bg-cyan-500',
  'G#': 'bg-sky-500',
  A: 'bg-blue-500',
  'A#': 'bg-violet-500',
  B: 'bg-purple-500',
};

/**
 * Get Tailwind class for a note's background color
 * @param note E.g. 'G4'
 * @returns string
 */
export function getColorForNote(note: string): string {
  const match = note.match(/^([A-G]#?)/);
  if (!match) return 'bg-gray-400';
  return noteColors[match[1]] ?? 'bg-gray-400';
}

