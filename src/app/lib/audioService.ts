/**
 * Audio service for playing piano sounds in the riff editor.
 * This service manages the audio elements and provides methods for playing notes.
 */

// Map of note names to audio file paths
const NOTE_TO_AUDIO: Record<string, string> = {
  "E2": "/audio/piano/E2.mp3",
  "F2": "/audio/piano/F2.mp3",
  "F#2": "/audio/piano/F#2.mp3",
  "G2": "/audio/piano/G2.mp3",
  "G#2": "/audio/piano/G#2.mp3",
  "A2": "/audio/piano/A2.mp3",
  "A#2": "/audio/piano/A#2.mp3",
  "B2": "/audio/piano/B2.mp3",
  "C3": "/audio/piano/C3.mp3",
  "C#3": "/audio/piano/C#3.mp3",
  "D3": "/audio/piano/D3.mp3",
  "D#3": "/audio/piano/D#3.mp3",
  "E3": "/audio/piano/E3.mp3",
  "F3": "/audio/piano/F3.mp3",
  "F#3": "/audio/piano/F#3.mp3",
  "G3": "/audio/piano/G3.mp3",
  "G#3": "/audio/piano/G#3.mp3",
  "A3": "/audio/piano/A3.mp3",
  "A#3": "/audio/piano/A#3.mp3",
  "B3": "/audio/piano/B3.mp3",
  "C4": "/audio/piano/C4.mp3",
  "C#4": "/audio/piano/C#4.mp3",
  "D4": "/audio/piano/D4.mp3",
  "D#4": "/audio/piano/D#4.mp3",
  "E4": "/audio/piano/E4.mp3",
  "F4": "/audio/piano/F4.mp3",
  "F#4": "/audio/piano/F#4.mp3",
  "G4": "/audio/piano/G4.mp3",
  "G#4": "/audio/piano/G#4.mp3",
  "A4": "/audio/piano/A4.mp3",
  "A#4": "/audio/piano/A#4.mp3",
  "B4": "/audio/piano/B4.mp3",
  "C5": "/audio/piano/C5.mp3",
};

// Cache for audio elements
const audioElementCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a note
 */
export async function playNote(note: string) {
  try {
    // Check if we already have this audio element cached
    if (!audioElementCache[note]) {
      // Get the audio file path for this note
      const audioPath = NOTE_TO_AUDIO[note];
      if (!audioPath) {
        console.error(`No audio file found for note: ${note}`);
        return null;
      }
      
      // Create a new audio element
      const audioElement = new Audio();
      
      // For sharp notes, we need to encode the # character
      if (note.includes('#')) {
        // Replace # with %23 in the URL
        const encodedPath = audioPath.replace('#', '%23');
        audioElement.src = encodedPath;
      } else {
        audioElement.src = audioPath;
      }
      
      audioElementCache[note] = audioElement;
    }
    
    // Play the note
    const audioElement = audioElementCache[note];
    audioElement.currentTime = 0; // Reset to beginning
    await audioElement.play();
    
    return audioElement;
  } catch (error) {
    console.error(`Error playing note ${note}:`, error);
    return null;
  }
}

/**
 * Play a sequence of notes
 */
export async function playNoteSequence(notes: { pitch: string, time: number }[], bpm: number) {
  // Calculate the duration of a step in seconds
  const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4;
  const stepDuration = (60 / bpm) / stepsPerBeat;
  
  // Schedule all notes
  const startTime = Date.now();
  
  notes.forEach(note => {
    const playTime = startTime + (note.time * stepDuration * 1000);
    const delay = playTime - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        playNote(note.pitch);
      }, delay);
    } else {
      // If the delay is negative (note should have played in the past),
      // play it immediately
      playNote(note.pitch);
    }
  });
  
  // Return the total duration of the sequence
  const lastNote = notes.reduce((latest, note) => Math.max(latest, note.time), 0);
  return (lastNote + 1) * stepDuration;
}

/**
 * Stop all currently playing sounds
 */
export function stopAllSounds() {
  // Stop all audio elements
  Object.values(audioElementCache).forEach(audioElement => {
    audioElement.pause();
    audioElement.currentTime = 0;
  });
}

/**
 * Initialize the audio context (kept for compatibility)
 */
export function initAudioContext() {
  // No-op for compatibility
  return null;
} 