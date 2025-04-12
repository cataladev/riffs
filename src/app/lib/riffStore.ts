/**
 * Represents a single note in the riff using a piano roll model.
 * @property id - A unique identifier for the note.
 * @property pitch - The musical pitch (e.g. "E4").
 * @property time - The time coordinate (or step) on the piano roll.
 */
export type RiffNote = {
  id: string;
  pitch: string;
  time: number;
}

/**
 * Represents a complete riff session.
 * @property id - A unique identifier for the riff.
 * @property name - The name of the riff.
 * @property recording - The name or identifier for the session.
 * @property notes - An array of notes that belong to the session.
 * @property bpm - The beats per minute for the riff.
 */
export type Riff = {
  id: string;
  name: string;
  recording: string;
  notes: RiffNote[];
  bpm: number;
}

// In-memory storage for the current riff.
// This is a temporary store and can be replaced with a persistent backend in the future.
let currentRiff: Riff | null = null;

/**
 * Saves the current riff to the in-memory store.
 * @param riff - The riff session to save.
 */
export function saveRiff(riff: Riff): void {
  currentRiff = riff;
}

/**
 * Retrieves the current riff from the in-memory store.
 * @returns The current riff, or null if none is available.
 */
export function getRiff(): Riff | null {
  return currentRiff;
}

/**
 * Updates the notes of the current riff.
 * @param notes - The new notes to update the current riff with.
 * @param bpm - The beats per minute for the riff.
 * @returns true if the update was successful, false if no riff exists.
 */
export function updateRiffNotes(notes: RiffNote[], bpm: number): boolean {
  if (!currentRiff) return false;
  
  currentRiff = {
    ...currentRiff,
    notes,
    bpm
  };
  
  return true;
}
