"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import GuitarFretboard from './GuitarFretboard';
import { playNote, stopAllSounds, initAudioContext } from '../lib/audioService';

const EXTRACT_OCTAVE = /\d+$/;

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

interface NoteSequencePlayerProps {
  initialNotes?: string[];
  initialTempo?: number;
  autoPlay?: boolean;
}

export default function NoteSequencePlayer({ 
  initialNotes = ['E4', 'G4', 'B4', 'E5', 'D5', 'B4'],
  initialTempo = 120,
  autoPlay = false
}: NoteSequencePlayerProps) {
  const [notes, setNotes] = useState<string[]>(initialNotes);
  const [tempo, setTempo] = useState(initialTempo);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [newNote, setNewNote] = useState('');
  const playIntervalRef = useRef<number | null>(null);

  // Define playSequence with useCallback before it's used in useEffect
  const playSequence = useCallback(() => {
    // If already playing, stop everything
    if (isPlaying) {
      stopAllSounds();
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      return;
    }

    // Start playing
    setIsPlaying(true);
    setCurrentNoteIndex(0);

    // Calculate the interval between notes based on BPM
    // Make each note play for 2 beats to give more time to see the visualization
    const noteDuration = (60 / tempo) * 1000 * 2;
    
    // Play the first note immediately
    if (notes.length > 0) {
      playNote(notes[0]);
    }

    // Set up interval to play subsequent notes
    let currentIndex = 1;
    playIntervalRef.current = window.setInterval(() => {
      if (currentIndex >= notes.length) {
        // We've reached the end of the sequence
        stopAllSounds();
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
          playIntervalRef.current = null;
        }
        setIsPlaying(false);
        setCurrentNoteIndex(-1);
        return;
      }

      // Stop previous note and play current note
      stopAllSounds();
      playNote(notes[currentIndex]);
      setCurrentNoteIndex(currentIndex);
      currentIndex++;
    }, noteDuration);
  }, [isPlaying, notes, tempo]);

  // Cleanup function to stop playback
  const stopPlayback = useCallback(() => {
    stopAllSounds();
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
  }, []);

  // Auto-play if enabled
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const handleUserInteraction = () => {
      initAudioContext();
      
      // Only start playing if autoPlay is true and we haven't started yet
      if (autoPlay && !isPlaying && notes.length > 0) {
        timer = setTimeout(() => {
          playSequence();
        }, 500);
      }
      
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      stopPlayback();
    };
  }, [autoPlay, notes, isPlaying, playSequence, stopPlayback]);

  // Add a new note to the sequence
  const addNote = () => {
    if (newNote.trim()) {
      // Validate note format (e.g., E4, A3, G#3)
      const noteRegex = /^[A-G][#b]?\d+$/;
      if (!noteRegex.test(newNote)) {
        alert('Please enter a valid note (e.g., E4, A3, G#3)');
        return;
      }

      // Extract octave number
      const octave = parseInt(newNote.match(/\d+$/)?.[0] || '4');
      
      // Only allow notes between E2 and E6 (standard guitar range)
      if (octave < 2 || octave > 6) {
        alert('Please enter a note within the guitar range (E2 to E6)');
        return;
      }

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

  // Get the current note being played
  const currentNote = currentNoteIndex >= 0 ? notes[currentNoteIndex] : null;

  // ui snip that displays info abt. current note playing 
  const currentNoteDisplay = currentNoteIndex >= 0 && (
    <div className="mb-4 text-center">
      <div className="text-xl font-bold mb-1 text-gray-700">
        Currently Playing:
        <span className={`ml-2 px-3 py-1 rounded-full text-white ${getNoteColor(notes[currentNoteIndex])}`}>
          {notes[currentNoteIndex]}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Guitar Fretboard Visualizer</h1>
      {currentNoteDisplay}

      {/* Fretboard */}
      <GuitarFretboard currentNote={currentNote} />

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
            className={`px-4 py-2 rounded-md font-bold w-full transition-colors ${
              isPlaying 
                ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                : 'bg-pink-500 hover:bg-pink-600 text-white'
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