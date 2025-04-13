"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type GameState = {
  status: 'idle' | 'playing' | 'finished';
  score: number;
  correct: number;
  incorrect: number;
};

type GameContextType = {
  currentNote: string | null;
  gameState: GameState;
  startGame: () => void;
  checkNote: (note: string) => boolean;
  resetGame: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

// Generate a random note from the standard tuning
const generateRandomNote = (): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octaves = [2, 3, 4];
  const randomNote = notes[Math.floor(Math.random() * notes.length)];
  const randomOctave = octaves[Math.floor(Math.random() * octaves.length)];
  return `${randomNote}${randomOctave}`;
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    score: 0,
    correct: 0,
    incorrect: 0
  });

  const startGame = () => {
    setGameState({
      status: 'playing',
      score: 0,
      correct: 0,
      incorrect: 0
    });
    setCurrentNote(generateRandomNote());
  };

  const checkNote = (note: string): boolean => {
    // For now, we'll just check if the note matches exactly
    // In a real implementation, this would use audio processing to detect the played note
    const isCorrect = note === currentNote;
    
    setGameState(prev => {
      const newScore = isCorrect ? prev.score + 10 : Math.max(0, prev.score - 5);
      const newCorrect = isCorrect ? prev.correct + 1 : prev.correct;
      const newIncorrect = isCorrect ? prev.incorrect : prev.incorrect + 1;
      
      // Check if game should end (after 10 notes)
      const totalNotes = newCorrect + newIncorrect;
      const shouldEnd = totalNotes >= 10;
      
      return {
        ...prev,
        score: newScore,
        correct: newCorrect,
        incorrect: newIncorrect,
        status: shouldEnd ? 'finished' : 'playing'
      };
    });
    
    // Generate a new note if the game is still playing
    if (gameState.status === 'playing' && (gameState.correct + gameState.incorrect) < 9) {
      setTimeout(() => {
        setCurrentNote(generateRandomNote());
      }, 500);
    }
    
    return isCorrect;
  };

  const resetGame = () => {
    setGameState({
      status: 'idle',
      score: 0,
      correct: 0,
      incorrect: 0
    });
    setCurrentNote(null);
  };

  return (
    <GameContext.Provider value={{ currentNote, gameState, startGame, checkNote, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
} 