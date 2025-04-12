"use client"

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

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
        positions.push({ stringIndex: stringIndex, fret: fret });
      }
    }
  });

  return positions;
};

// Generate a color based on note name for consistent coloring
// Keep original color mapping for notes
const getNoteColor = (note: string) => {
  const baseNote = note.replace(EXTRACT_OCTAVE, '');
  const colorMap: Record<string, string> = {
    'C': 'bg-red-500',
    'C#': 'bg-red-600',
    'D': 'bg-orange-500',
    'D#': 'bg-orange-600',
    'E': 'bg-yellow-500',
    'F': 'bg-green-500',
    'F#': 'bg-green-600',
    'G': 'bg-blue-500',
    'G#': 'bg-blue-600',
    'A': 'bg-indigo-500',
    'A#': 'bg-indigo-600',
    'B': 'bg-purple-500'
  };

  return colorMap[baseNote] || 'bg-gray-500';
};

export default function GuitarFretboardVisualizer() {
  const [notes, setNotes] = useState(['E4', 'G4', 'B4', 'E5', 'D5', 'B4']);
  const [tempo, setTempo] = useState(120);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [newNote, setNewNote] = useState('');
  const synthRef = useRef<Tone.Synth<Tone.SynthOptions> | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const [fretboardWidth, setFretboardWidth] = useState(0);
  const fretboardRef = useRef<HTMLDivElement>(null);

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

  // Add a new note to the sequence
  const addNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, newNote]);
      setNewNote('');
    }
  };

  // Remove a note from the sequence
  const removeNote = (index: number) => {
    const updatedNotes = [...notes];
    updatedNotes.splice(index, 1);
    setNotes(updatedNotes);
  };

  // Play the sequence of notes
  const playSequence = () => {
    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      return;
    }

    setIsPlaying(true);

    // Set the tempo
    Tone.Transport.bpm.value = tempo;

    // Create a sequence
    const noteEvents = notes.map((_, i) => i);

    if (sequenceRef.current) {
      sequenceRef.current.dispose();
    }

    sequenceRef.current = new Tone.Sequence(
      (time, index) => {
        setCurrentNoteIndex(index);
        synthRef.current?.triggerAttackRelease(notes[index], '8n', time);
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
      sequenceRef.current?.dispose();
    }, `+${notes.length * (60 / tempo)}`)
  };

  // Get current positions for highlighting
  const currentPositions = currentNoteIndex >= 0
    ? getAllPositionsForNote(notes[currentNoteIndex])
    : [];

  // Get the color for the current note
  const currentNoteColor = currentNoteIndex >= 0
    ? getNoteColor(notes[currentNoteIndex])
    : '';

  // get the display name for the current note (without octave)
  const currentNoteDisplayName = currentNoteIndex >= 0
    ? notes[currentNoteIndex].replace(EXTRACT_OCTAVE, '')
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
    </div>
  )

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Guitar Fretboard Visualizer</h1>
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

                {/* Note positions for this string */}
                {currentPositions
                  .filter(pos => pos.stringIndex === stringIndex)
                  .map(pos => (
                    <div
                      key={`${stringIndex}-${pos.fret}`}
                      className={`absolute w-8 h-8 ${currentNoteColor} rounded-full flex items-center justify-center z-20 shadow-md`}
                      style={{
                        left: `${labelWidth + (pos.fret * fretSpacing) - fretSpacing / 2 - 16}px`,
                        top: '-16px' // Center vertically on the string
                      }}
                    >
                      <span className="text-white text-xs font-bold">
                        {currentNoteDisplayName}
                      </span>
                    </div>
                  ))
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
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">Tempo (BPM)</label>
          <div className="flex items-center">
            <input
              type="range"
              min="40"
              max="240"
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value))}
              className="mr-4 w-full accent-pink-500"
            />
            <span className="w-12 text-center text-gray-700">{tempo}</span>
          </div>
        </div>

        <div className="mb-2">
          <button
            onClick={playSequence}
            className={`px-4 py-2 rounded-md font-bold w-full transition-colors ${isPlaying ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'
              }`}
          >
            {isPlaying ? 'Stop' : 'Play Sequence'}
          </button>
        </div>
      </div>

      {/* Note Sequence */}
      <div className="w-full bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Note Sequence</h2>

        <div className="flex mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter note (e.g. E4, A3, D#4)"
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-700"
          />
          <button
            onClick={addNote}
            className="bg-pink-500 text-white px-4 py-2 rounded-r-md hover:bg-pink-600 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {notes.map((note, index) => {
            const noteColor = getNoteColor(note);
            return (
              <div
                key={index}
                className={`px-3 py-1 rounded-full flex items-center ${index === currentNoteIndex
                  ? `${noteColor} text-white shadow-sm`
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
              >
                <span className="mr-2">{note}</span>
                <button
                  onClick={() => removeNote(index)}
                  className="text-xs font-bold hover:text-pink-500"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="mb-4 border-t border-gray-100 pt-4">
          <h3 className="text-md font-bold mb-2 text-gray-700">Note Colors</h3>
          <div className="flex flex-wrap gap-3">
            {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
              <div key={note} className="flex items-center">
                <div className={`w-4 h-4 rounded-full ${getNoteColor(note)} mr-2 shadow-sm`}></div>
                <span className="text-sm text-gray-600">{note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <p className="mb-2 font-medium">Tips:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use note format like E4, A3, G#3, Bb4</li>
            <li>Standard tuning: E2-A2-D3-G3-B3-E4</li>
            <li>Full 24-fret fretboard visualization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
