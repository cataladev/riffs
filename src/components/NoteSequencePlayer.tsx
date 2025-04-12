import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteSequence } from '../types/note';
import Fretboard from './Fretboard';

interface NoteSequencePlayerProps {
  sequence: NoteSequence;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

const NoteSequencePlayer: React.FC<NoteSequencePlayerProps> = ({
  sequence,
  onPlay,
  onPause,
  onEnd,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const standardTuning = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
  const numFrets = 12;

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - currentTime;
      const playNotes = () => {
        const now = performance.now();
        const elapsed = now - startTimeRef.current;
        setCurrentTime(elapsed);

        // Find notes that should be active at this time
        const currentActiveNotes = sequence.notes
          .filter(note => {
            const noteStart = note.timestamp;
            const noteEnd = noteStart + 500; // Show note for 500ms
            return elapsed >= noteStart && elapsed < noteEnd;
          })
          .map(note => note.pitch);

        setActiveNotes(currentActiveNotes);

        // Check if we've reached the end
        const lastNote = sequence.notes[sequence.notes.length - 1];
        if (lastNote && elapsed > lastNote.timestamp + 500) {
          setIsPlaying(false);
          setCurrentTime(0);
          setActiveNotes([]);
          onEnd?.();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(playNotes);
      };

      animationFrameRef.current = requestAnimationFrame(playNotes);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, sequence, onEnd]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      onPause?.();
    } else {
      setIsPlaying(true);
      onPlay?.();
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveNotes([]);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="w-full max-w-4xl">
        <Fretboard
          activeNotes={activeNotes}
          strings={standardTuning}
          frets={numFrets}
        />
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={togglePlay}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default NoteSequencePlayer; 