"use client"

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

// Define the standard tuning for a guitar (from low to high)
const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

// Number of frets to display
const FRET_COUNT = 12;

// Helper function to get the note at a specific fret on a specific string
const getNoteAtPosition = (stringNote, fret) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const baseNote = stringNote.replace(/\d+$/, '');
  const octave = parseInt(stringNote.match(/\d+$/)?.[0] || '4');

  // Find the index of the base note
  const baseIndex = notes.findIndex(n => n === baseNote);
  if (baseIndex === -1) return null;

  // Calculate the new note index and octave
  const newIndex = (baseIndex + fret) % 12;
  const octaveChange = Math.floor((baseIndex + fret) / 12);
  const newOctave = octave + octaveChange;

  return `${notes[newIndex]}${newOctave}`;
};

// Find all possible positions for a note on the fretboard
const getAllPositionsForNote = (note) => {
  const positions = [];
  const baseNote = note.replace(/\d+$/, '');
  const octave = parseInt(note.match(/\d+$/)?.[0] || '4');

  STANDARD_TUNING.forEach((stringNote, stringIndex) => {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const noteAtPosition = getNoteAtPosition(stringNote, fret);
      const posBaseNote = noteAtPosition.replace(/\d+$/, '');
      const posOctave = parseInt(noteAtPosition.match(/\d+$/)?.[0] || '4');

      if (posBaseNote === baseNote && posOctave === octave) {
        positions.push({ string: stringIndex, fret });
      }
    }
  });

  return positions;
};

// Generate a color based on note name for consistent coloring
const getNoteColor = (note) => {
  const baseNote = note.replace(/\d+$/, '');
  const colorMap = {
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
  const synthRef = useRef(null);
  const sequenceRef = useRef(null);

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

  // Add a new note to the sequence
  const addNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, newNote]);
      setNewNote('');
    }
  };

  // Remove a note from the sequence
  const removeNote = (index) => {
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
        synthRef.current.triggerAttackRelease(notes[index], '8n', time);
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
      sequenceRef.current.dispose();
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

  // Get the display name for the current note (without octave)
  const currentNoteDisplay = currentNoteIndex >= 0
    ? notes[currentNoteIndex].replace(/\d+$/, '')
    : '';

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Guitar Fretboard Visualizer</h1>

      {/* Current Note Display */}
      {currentNoteIndex >= 0 && (
        <div className="mb-4 text-center">
          <div className="text-xl font-bold mb-1">
            Currently Playing:
            <span className={`ml-2 px-3 py-1 rounded-full text-white ${currentNoteColor}`}>
              {notes[currentNoteIndex]}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {currentPositions.length} position{currentPositions.length !== 1 ? 's' : ''} on the fretboard
          </div>
        </div>
      )}

      {/* Fretboard */}
      <div className="w-full mb-6 bg-white p-4 rounded-lg shadow">
        {/* Full Fretboard with Fixed Width */}
        <div className="relative w-full">
          {/* Vertical fret lines - Now drawn first and continuously */}
          <div className="relative mb-2" style={{ height: '220px' }}>
            {/* Nut - thicker first vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-2 bg-gray-800 z-10"></div>

            {/* Fret lines - continuous vertical lines */}
            {[...Array(FRET_COUNT)].map((_, fretIndex) => (
              <div
                key={fretIndex}
                className="absolute top-0 bottom-0 w-px bg-gray-400 z-10"
                style={{ left: `${8 + 42 * (fretIndex + 1)}px` }}
              ></div>
            ))}

            {/* Fret markers (dots) */}
            {[2, 4, 6, 8, 11].map((fretIndex) => (
              <div
                key={fretIndex}
                className="absolute w-4 h-4 bg-gray-300 rounded-full z-5"
                style={{
                  left: `${8 + 42 * fretIndex + 21}px`, // Center of the fret
                  bottom: '10px'
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
                <div className="absolute left-0 text-center font-bold w-8">{stringNote.replace(/\d+$/, '')}</div>

                {/* Actual String Line - continuous across all frets */}
                <div className={`absolute left-8 right-0 h-1 ${stringIndex < 3 ? 'bg-gray-600' : 'bg-gray-400'
                  } z-1`}></div>

                {/* Note positions for this string */}
                {currentPositions
                  .filter(pos => pos.string === stringIndex)
                  .map(pos => (
                    <div
                      key={`${stringIndex}-${pos.fret}`}
                      className={`absolute w-8 h-8 ${currentNoteColor} rounded-full flex items-center justify-center z-20`}
                      style={{
                        left: `${8 + (pos.fret * 42) - 16}px`, // Center on the fret/string intersection
                        top: '-16px' // Center vertically on the string
                      }}
                    >
                      <span className="text-white text-xs font-bold">
                        {currentNoteDisplay}
                      </span>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>

          {/* Fret numbers */}
          <div className="flex ml-8 mt-4">
            {[...Array(FRET_COUNT + 1)].map((_, fretIndex) => (
              <div
                key={fretIndex}
                className="text-center text-xs"
                style={{ width: '42px' }}
              >
                {fretIndex}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full bg-white p-4 rounded-lg shadow mb-6">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Tempo (BPM)</label>
          <div className="flex items-center">
            <input
              type="range"
              min="40"
              max="240"
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value))}
              className="mr-4 w-full"
            />
            <span className="w-12 text-center">{tempo}</span>
          </div>
        </div>

        <div className="mb-2">
          <button
            onClick={playSequence}
            className={`px-4 py-2 rounded-md font-bold w-full ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            {isPlaying ? 'Stop' : 'Play Sequence'}
          </button>
        </div>
      </div>

      {/* Note Sequence */}
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Note Sequence</h2>

        <div className="flex mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter note (e.g. E4, A3, D#4)"
            className="flex-grow p-2 border rounded-l-md"
          />
          <button
            onClick={addNote}
            className="bg-green-500 text-white px-4 py-2 rounded-r-md hover:bg-green-600"
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
                  ? `${noteColor} text-white`
                  : 'bg-gray-200'
                  }`}
              >
                <span className="mr-2">{note}</span>
                <button
                  onClick={() => removeNote(index)}
                  className="text-xs font-bold hover:text-red-500"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="mb-4">
          <h3 className="text-md font-bold mb-2">Note Colors</h3>
          <div className="flex flex-wrap gap-2">
            {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
              <div key={note} className="flex items-center">
                <div className={`w-4 h-4 rounded-full ${getNoteColor(note)} mr-1`}></div>
                <span className="text-xs">{note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p className="mb-2">Tips:</p>
          <ul className="list-disc pl-5">
            <li>Use note format like E4, A3, G#3, Bb4</li>
            <li>Standard tuning: E2-A2-D3-G3-B3-E4</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
