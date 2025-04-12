"use client"

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useSearchParams } from 'next/navigation';

const EXTRACT_OCTAVE = /\d+$/
const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const FRET_COUNT = 24;

// helper function to get the note at a specific fret on a specific string
const getNoteAtPosition = (stringNote: string, fret: number) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const baseNote = stringNote.replace(EXTRACT_OCTAVE, '');
  const octave = parseInt(stringNote.match(EXTRACT_OCTAVE)?.[0] || '4');

  // find the index of the base note
  const baseIndex = notes.findIndex(n => n === baseNote);
  if (baseIndex === -1)
    return null;

  // calculate the new note index and octave
  const newIndex = (baseIndex + fret) % 12;
  const octaveChange = Math.floor((baseIndex + fret) / 12);
  const newOctave = octave + octaveChange;

  return `${notes[newIndex]}${newOctave}`;
};

type NotePosition = {
  stringIndex: number,
  fret: number
}

// find all possible positions for a note on the fretboard
const getAllPositionsForNote = (note: string) => {
  const positions: NotePosition[] = [];

  const baseNote = note.replace(EXTRACT_OCTAVE, '');
  const octave = parseInt(note.match(EXTRACT_OCTAVE)?.[0] || '4');

  console.log(`Finding positions for note: ${note} (base: ${baseNote}, octave: ${octave})`);

  // for all notes in the std tuning 
  STANDARD_TUNING.forEach((stringNote, stringIndex) => {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      // get note at position; skip if none found
      const noteAtPosition = getNoteAtPosition(stringNote, fret);
      if (!noteAtPosition) {
        continue;
      }

      // get the base note and octave
      const posBaseNote = noteAtPosition.replace(EXTRACT_OCTAVE, '');
      const posOctave = parseInt(noteAtPosition.match(/\d+$/)?.[0] || '4');

      // if this note in the fretboard matches the given one, store its position
      if (posBaseNote === baseNote && posOctave === octave) {
        console.log(`Found match at string ${stringIndex}, fret ${fret}: ${noteAtPosition}`);
        positions.push({ stringIndex: stringIndex, fret: fret });
      }
    }
  });

  // If no positions found, try to find the closest match
  if (positions.length === 0) {
    console.log(`No exact matches found for ${note}, looking for fallback positions`);
    // Try to find a note with the same base note but different octave
    STANDARD_TUNING.forEach((stringNote, stringIndex) => {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const noteAtPosition = getNoteAtPosition(stringNote, fret);
        if (!noteAtPosition) {
          continue;
        }

        const posBaseNote = noteAtPosition.replace(EXTRACT_OCTAVE, '');
        
        // If base note matches but octave doesn't, add it as a fallback
        if (posBaseNote === baseNote) {
          console.log(`Found fallback at string ${stringIndex}, fret ${fret}: ${noteAtPosition}`);
          positions.push({ stringIndex: stringIndex, fret: fret });
        }
      }
    });
  }

  console.log(`Total positions found for ${note}: ${positions.length}`);
  return positions;
};

// Generate a color based on note name for consistent coloring
// Using brand colors from the landing page
const getNoteColor = (note: string) => {
  const baseNote = note.replace(EXTRACT_OCTAVE, '');
  const colorMap: Record<string, string> = {
    'C': 'bg-[#9722b6]', // Purple
    'C#': 'bg-[#9722b6]', // Purple
    'D': 'bg-[#fe5b35]', // Orange
    'D#': 'bg-[#fe5b35]', // Orange
    'E': 'bg-[#eb3d5f]', // Pink
    'F': 'bg-[#9722b6]', // Purple
    'F#': 'bg-[#9722b6]', // Purple
    'G': 'bg-[#fe5b35]', // Orange
    'G#': 'bg-[#fe5b35]', // Orange
    'A': 'bg-[#eb3d5f]', // Pink
    'A#': 'bg-[#eb3d5f]', // Pink
    'B': 'bg-[#9722b6]' // Purple
  };

  return colorMap[baseNote] || 'bg-gray-500';
};

// Convert frequency to note name
const frequencyToNote = (frequency: number): string => {
  const noteNum = 12 * (Math.log2(frequency / 440) + 4);
  const note = Math.round(noteNum);
  const octave = Math.floor(note / 12) - 1;
  const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][note % 12];
  return `${noteName}${octave}`;
};

// Check if two notes match (same base note, octave can be different)
const notesMatch = (note1: string, note2: string): boolean => {
  const baseNote1 = note1.replace(EXTRACT_OCTAVE, '');
  const baseNote2 = note2.replace(EXTRACT_OCTAVE, '');
  return baseNote1 === baseNote2;
};

// Keyboard mapping for notes
const KEYBOARD_MAPPING: Record<string, string> = {
  'a': 'E2', // 6th string (low E)
  's': 'A2', // 5th string (A)
  'd': 'D3', // 4th string (D)
  'f': 'G3', // 3rd string (G)
  'g': 'B3', // 2nd string (B)
  'h': 'E4'  // 1st string (high E)
};

export default function GuitarFretboardVisualizer() {
  const searchParams = useSearchParams();
  const notesParam = searchParams.get('notes');
  const bpmParam = searchParams.get('bpm');
  
  // Parse notes and BPM from URL parameters
  const initialNotes = notesParam ? JSON.parse(decodeURIComponent(notesParam)) : ['E4', 'G4', 'B4', 'E5', 'D5', 'B4'];
  const initialTempo = bpmParam ? parseInt(decodeURIComponent(bpmParam)) : 120;
  
  const [notes, setNotes] = useState(initialNotes);
  const [tempo, setTempo] = useState(initialTempo);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'visualize' | 'keyboard' | 'guitar'>('visualize');
  const [score, setScore] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [nextNoteIndex, setNextNoteIndex] = useState(-1);
  const [lastKeyPressTime, setLastKeyPressTime] = useState(0);
  const [keyCooldown, setKeyCooldown] = useState(false);
  const [scoredNotes, setScoredNotes] = useState<Set<number>>(new Set());
  
  const synthRef = useRef<Tone.Synth<Tone.SynthOptions> | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const [fretboardWidth, setFretboardWidth] = useState(0);
  const fretboardRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPlayedNoteRef = useRef<string | null>(null);
  const lastPlayedTimeRef = useRef<number>(0);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Tone.js synth
  useEffect(() => {
    synthRef.current = new Tone.Synth().toDestination();

    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Set up responsive fretboard width
  useEffect(() => {
    const updateWidth = () => {
      if (fretboardRef.current) {
        setFretboardWidth(fretboardRef.current.clientWidth);
      }
    };

    // Initial width setup
    updateWidth();

    // Listen for resize events
    window.addEventListener('resize', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Handle keyboard input for keyboard mode
  useEffect(() => {
    if (mode !== 'keyboard' || !isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const now = Date.now();
      
      // Allow key presses but enforce a small cooldown to prevent excessive events
      if (now - lastKeyPressTime < 100) {
        return;
      }
      
      if (KEYBOARD_MAPPING[key] && currentNoteIndex >= 0) {
        setLastKeyPressTime(now);
        
        const playedNote = KEYBOARD_MAPPING[key];
        const targetNote = notes[currentNoteIndex];
        
        // Check if the played note matches the target note
        if (notesMatch(playedNote, targetNote)) {
          // Only award points if this note hasn't been scored yet
          if (!scoredNotes.has(currentNoteIndex)) {
            setScore(prev => Math.min(prev + 1, totalNotes));
            setScoredNotes(prev => {
              const newSet = new Set(prev);
              newSet.add(currentNoteIndex);
              return newSet;
            });
            setFeedback('Correct! +1 point');
          } else {
            setFeedback('Correct! (already scored)');
          }
          setTimeout(() => setFeedback(''), 1000);
        } else {
          // Only deduct points if the note hasn't been scored yet
          if (!scoredNotes.has(currentNoteIndex)) {
            setScore(prev => Math.max(0, prev - 1));
            setFeedback('Wrong key! -1 point');
          } else {
            setFeedback('Wrong key! (already scored)');
          }
          setTimeout(() => setFeedback(''), 1000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, isPlaying, currentNoteIndex, notes, lastKeyPressTime, totalNotes, scoredNotes]);

  // Set up audio context and pitch detection for guitar mode
  const setupAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      setIsListening(true);
      detectPitch();
    } catch (error) {
      console.error('Error setting up audio context:', error);
      setFeedback('Error accessing microphone. Please check permissions.');
    }
  };

  // Detect pitch from audio input
  const detectPitch = () => {
    if (!isListening || !analyserRef.current) return;
    
    // Simple pitch detection using autocorrelation
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);
    
    // Find the fundamental frequency using autocorrelation
    let sum = 0;
    let maxSum = 0;
    let maxIndex = 0;
    
    for (let lag = 0; lag < bufferLength / 2; lag++) {
      sum = 0;
      for (let i = 0; i < bufferLength - lag; i++) {
        sum += dataArray[i] * dataArray[i + lag];
      }
      if (sum > maxSum) {
        maxSum = sum;
        maxIndex = lag;
      }
    }
    
    // Convert lag to frequency
    const frequency = audioContextRef.current!.sampleRate / maxIndex;
    
    // Only process if we have a reasonable frequency
    if (frequency > 20 && frequency < 2000 && currentNoteIndex >= 0) {
      const detectedNote = frequencyToNote(frequency);
      
      // Only process a new note after a short delay to avoid duplicates
      const now = Date.now();
      if (detectedNote !== lastPlayedNoteRef.current || now - lastPlayedTimeRef.current > 500) {
        lastPlayedNoteRef.current = detectedNote;
        lastPlayedTimeRef.current = now;
        
        const targetNote = notes[currentNoteIndex];
        
        // Check if the detected note matches the target note
        if (notesMatch(detectedNote, targetNote)) {
          setScore(prev => prev + 1);
          setFeedback('Correct!');
          setTimeout(() => setFeedback(''), 1000);
        } else {
          setFeedback(`Detected: ${detectedNote}, Target: ${targetNote}`);
          setTimeout(() => setFeedback(''), 1000);
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(detectPitch);
  };

  // Play the sequence of notes
  const playSequence = () => {
    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      setNextNoteIndex(-1);
      setIsListening(false);
      setShowResults(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      return;
    }

    setIsPlaying(true);
    setScore(0);
    setTotalNotes(notes.length);
    setScoredNotes(new Set()); // Reset scored notes
    setShowResults(false);

    // Set the tempo
    Tone.Transport.bpm.value = tempo;

    // Create a sequence
    const noteEvents = notes.map((_: string, i: number) => i);

    if (sequenceRef.current) {
      sequenceRef.current.dispose();
    }

    // Function to show preview of next note
    const showNextNotePreview = (index: number) => {
      if (index < notes.length - 1) {
        setNextNoteIndex(index + 1);
        
        // Clear any existing timeout
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }
        
        // Set a timeout to clear the preview before the note plays
        previewTimeoutRef.current = setTimeout(() => {
          setNextNoteIndex(-1);
        }, 500);
      }
    };

    sequenceRef.current = new Tone.Sequence(
      (time, index) => {
        setCurrentNoteIndex(index);
        synthRef.current?.triggerAttackRelease(notes[index], '8n', time);
        
        // Show preview of next note
        showNextNotePreview(index);
      },
      noteEvents,
      '4n'
    ).start(0);

    // Start the transport
    Tone.Transport.start();

    // Stop after playing all notes
    Tone.Transport.scheduleOnce(() => {
      Tone.Transport.stop();
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      setNextNoteIndex(-1);
      sequenceRef.current?.dispose();
      setIsListening(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      
      // Show results screen only in keyboard or guitar mode
      if (mode !== 'visualize') {
        setShowResults(true);
      }
    }, `+${notes.length * (60 / tempo)}`)
  };

  // Start guitar mode
  const startGuitarMode = async () => {
    setMode('guitar');
    await setupAudioContext();
  };

  // Get current positions for highlighting
  const currentPositions = currentNoteIndex >= 0
    ? getAllPositionsForNote(notes[currentNoteIndex])
    : [];

  // Get next note positions for preview
  const nextNotePositions = nextNoteIndex >= 0
    ? getAllPositionsForNote(notes[nextNoteIndex])
    : [];

  // Get the color for the current note
  const currentNoteColor = currentNoteIndex >= 0
    ? getNoteColor(notes[currentNoteIndex])
    : '';

  // Get the color for the next note
  const nextNoteColor = nextNoteIndex >= 0
    ? getNoteColor(notes[nextNoteIndex])
    : '';

  // get the display name for the current note (without octave)
  const currentNoteDisplayName = currentNoteIndex >= 0
    ? notes[currentNoteIndex].replace(EXTRACT_OCTAVE, '')
    : '';

  // get the display name for the next note (without octave)
  const nextNoteDisplayName = nextNoteIndex >= 0
    ? notes[nextNoteIndex].replace(EXTRACT_OCTAVE, '')
    : '';

  // Calculate fret spacing
  const labelWidth = 40; // Width for string labels
  const availableWidth = fretboardWidth ? fretboardWidth - labelWidth : 0;
  const fretSpacing = availableWidth / (FRET_COUNT + 1); // +1 to include the nut

  // ui snip that displays info abt. current note playing 
  const currentNoteDisplay = currentNoteIndex >= 0 && (
    <div className="mb-4 text-center">
      <div className="text-xl font-bold mb-1 text-gray-700">
        Currently Playing:
        <span className={`ml-2 px-3 py-1 rounded-full text-white ${currentNoteColor}`}>
          {notes[currentNoteIndex]}
        </span>
      </div>
      <div className="text-sm text-gray-500">
        {currentPositions.length} position{currentPositions.length !== 1 ? 's' : ''} on the fretboard
      </div>
      {nextNoteIndex >= 0 && (
        <div className="mt-2 text-sm text-gray-600">
          Next: <span className={`px-2 py-0.5 rounded-full text-white ${nextNoteColor}`}>{notes[nextNoteIndex]}</span>
        </div>
      )}
      {feedback && (
        <div className={`mt-2 text-lg font-bold ${feedback.includes('Correct') ? 'text-[#9722b6]' : 'text-[#fe5b35]'}`}>
          {feedback}
        </div>
      )}
      {mode !== 'visualize' && (
        <div className="mt-2 text-lg font-bold text-gray-700">
          Score: {score}/{totalNotes}
        </div>
      )}
    </div>
  )

  // Results screen
  const resultsScreen = showResults && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Results</h2>
        
        <div className="mb-6 text-center">
          <div className="text-4xl font-bold text-[#eb3d5f] mb-2">{score}/{totalNotes}</div>
          <div className="text-gray-600">
            {score === totalNotes ? 'Perfect!' : 
             score >= totalNotes * 0.8 ? 'Great job!' : 
             score >= totalNotes * 0.6 ? 'Good effort!' : 
             'Keep practicing!'}
          </div>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={playSequence}
            className="px-6 py-2 bg-[#9722b6] text-white rounded-md font-bold hover:bg-[#7a1b92] transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Guitar Fretboard Visualizer</h1>
      
      {/* Mode Selection */}
      <div className="w-full bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Select Mode</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setMode('visualize')}
            className={`flex-1 px-4 py-2 rounded-md font-bold transition-colors ${
              mode === 'visualize' ? 'bg-[#9722b6] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Visualize
          </button>
          <button
            onClick={() => setMode('keyboard')}
            className={`flex-1 px-4 py-2 rounded-md font-bold transition-colors ${
              mode === 'keyboard' ? 'bg-[#9722b6] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Keyboard Mode
          </button>
          <button
            onClick={startGuitarMode}
            className={`flex-1 px-4 py-2 rounded-md font-bold transition-colors ${
              mode === 'guitar' ? 'bg-[#9722b6] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Guitar Mode
          </button>
        </div>
      </div>
      
      {currentNoteDisplay}

      {/* Fretboard */}
      <div className="w-full mb-6 bg-white p-4 rounded-lg shadow-md">
        {/* Full Fretboard with Responsive Width */}
        <div className="relative w-full" ref={fretboardRef}>
          {/* Vertical fret lines - Now drawn first and continuously */}
          <div className="relative mb-2" style={{ height: '220px' }}>
            {/* Nut - thicker first vertical line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-gray-800 z-10"
              style={{ left: `${labelWidth}px` }}
            ></div>

            {/* Fret lines - continuous vertical lines */}
            {[...Array(FRET_COUNT)].map((_, fretIndex) => (
              <div
                key={fretIndex}
                className="absolute top-0 bottom-0 w-px bg-gray-300 z-10"
                style={{ left: `${labelWidth + fretSpacing * (fretIndex + 1)}px` }}
              ></div>
            ))}

            {/* Fret markers (dots) */}
            {[3, 5, 7, 9, 12, 15, 17, 19, 21, 24].map((fretIndex) => (
              <div
                key={fretIndex}
                className="absolute w-4 h-4 bg-gray-200 border border-gray-300 rounded-full z-5"
                style={{
                  left: `${labelWidth + fretSpacing * fretIndex - fretSpacing / 2}px`,
                  bottom: fretIndex === 12 || fretIndex === 24 ? '20px' : '10px'
                }}
              ></div>
            ))}

            {/* Double dots at 12th and 24th fret */}
            {[12, 24].map((fretIndex) => (
              <div
                key={`double-${fretIndex}`}
                className="absolute w-4 h-4 bg-gray-200 border border-gray-300 rounded-full z-5"
                style={{
                  left: `${labelWidth + fretSpacing * fretIndex - fretSpacing / 2}px`,
                  bottom: '40px'
                }}
              ></div>
            ))}

            {/* Strings and Notes */}
            {STANDARD_TUNING.map((stringNote, stringIndex) => (
              <div
                key={stringIndex}
                className="absolute w-full"
                style={{ top: `${stringIndex * 36 + 10}px` }}
              >
                {/* String label */}
                <div className="absolute left-0 text-center font-bold text-gray-700" style={{ width: `${labelWidth}px` }}>
                  {stringNote.replace(/\d+$/, '')}
                </div>

                {/* Actual String Line - continuous across all frets */}
                <div
                  className={`absolute h-px ${stringIndex < 3 ? 'bg-gray-500' : 'bg-gray-400'} z-1`}
                  style={{ left: `${labelWidth}px`, right: '0' }}
                ></div>

                {/* Current Note positions for this string */}
                {currentPositions
                  .filter(pos => pos.stringIndex === stringIndex)
                  .map(pos => {
                    // Ensure the fret position is valid
                    const validFret = Math.max(0, Math.min(pos.fret, FRET_COUNT));
                    return (
                      <div
                        key={`${stringIndex}-${validFret}`}
                        className={`absolute w-8 h-8 ${currentNoteColor} rounded-full flex items-center justify-center z-20 shadow-md`}
                        style={{
                          left: `${labelWidth + (validFret * fretSpacing) - 16}px`,
                          top: '-16px' // Center vertically on the string
                        }}
                      >
                        <span className="text-white text-xs font-bold">
                          {currentNoteDisplayName}
                        </span>
                      </div>
                    );
                  })
                }
                
                {/* Next Note positions for this string (preview) */}
                {nextNotePositions
                  .filter(pos => pos.stringIndex === stringIndex)
                  .map(pos => {
                    // Ensure the fret position is valid
                    const validFret = Math.max(0, Math.min(pos.fret, FRET_COUNT));
                    return (
                      <div
                        key={`next-${stringIndex}-${validFret}`}
                        className={`absolute w-6 h-6 ${nextNoteColor} rounded-full flex items-center justify-center z-15 shadow-md opacity-70`}
                        style={{
                          left: `${labelWidth + (validFret * fretSpacing) - 12}px`,
                          top: '-12px' // Center vertically on the string
                        }}
                      >
                        <span className="text-white text-xs font-bold">
                          {nextNoteDisplayName}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            ))}
          </div>

          {/* Fret numbers - responsive spacing */}
          <div className="flex mt-4 overflow-x-auto" style={{ paddingLeft: `${labelWidth}px` }}>
            {[...Array(FRET_COUNT + 1)].map((_, fretIndex) => (
              <div
                key={fretIndex}
                className="text-center text-xs flex-shrink-0 text-gray-600"
                style={{ width: `${fretSpacing}px` }}
              >
                {fretIndex}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="mb-2">
          <button
            onClick={playSequence}
            className={`px-4 py-2 rounded-md font-bold w-full transition-colors ${isPlaying ? 'bg-[#9722b6] hover:bg-[#7a1b92] text-white' : 'bg-[#fe5b35] hover:bg-[#e54a24] text-white'
              }`}
          >
            {isPlaying ? 'Stop' : 'Play Sequence'}
          </button>
        </div>
      </div>

      {/* Keyboard Guide (only shown in keyboard mode) */}
      {mode === 'keyboard' && (
        <div className="w-full bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Keyboard Guide</h2>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(KEYBOARD_MAPPING).map(([key, note]) => (
              <div key={key} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-md flex items-center justify-center ${getNoteColor(note)} text-white font-bold`}>
                  {key.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 mt-1">{note}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-gray-600">
            <p>Press the key corresponding to the string where the note appears</p>
          </div>
        </div>
      )}

      {/* Guitar Mode Instructions */}
      {mode === 'guitar' && (
        <div className="w-full bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Guitar Mode Instructions</h2>
          <div className="text-gray-700">
            <p className="mb-2">1. Allow microphone access when prompted</p>
            <p className="mb-2">2. Play the note shown on the fretboard with your guitar</p>
            <p className="mb-2">3. The app will detect if you're playing the correct note</p>
            <p className="mb-2">4. Your score will be displayed at the end</p>
          </div>
        </div>
      )}

      {/* Color Legend */}
      <div className="w-full bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Note Colors</h2>
        <div className="flex flex-wrap gap-3">
          {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
            <div key={note} className="flex items-center">
              <div className={`w-4 h-4 rounded-full ${getNoteColor(note)} mr-2 shadow-sm`}></div>
              <span className="text-sm text-gray-600">{note}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Results Screen */}
      {resultsScreen}
    </div>
  );
}
