"use client"

import React, { useRef, useState, useEffect } from 'react';

const EXTRACT_OCTAVE = /\d+$/;
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

interface GuitarFretboardProps {
  currentNote: string | null;
}

export default function GuitarFretboard({ currentNote }: GuitarFretboardProps) {
  const [fretboardWidth, setFretboardWidth] = useState(0);
  const fretboardRef = useRef<HTMLDivElement>(null);

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

  // Get current positions for highlighting
  const currentPositions = currentNote
    ? getAllPositionsForNote(currentNote)
    : [];

  // Get the color for the current note
  const currentNoteColor = currentNote
    ? getNoteColor(currentNote)
    : '';

  // get the display name for the current note (without octave)
  const currentNoteDisplayName = currentNote
    ? currentNote.replace(EXTRACT_OCTAVE, '')
    : '';

  // Calculate fret spacing
  const labelWidth = 40; // Width for string labels
  const availableWidth = fretboardWidth ? fretboardWidth - labelWidth : 0;
  const fretSpacing = availableWidth / (FRET_COUNT + 1); // +1 to include the nut

  return (
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
  );
} 