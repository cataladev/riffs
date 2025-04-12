export interface Note {
  pitch: string;  // e.g., "A4", "C#5"
  timestamp: number;  // milliseconds from start
}

export interface NoteSequence {
  notes: Note[];
  bpm?: number;  // optional beats per minute
}
