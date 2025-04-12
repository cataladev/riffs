"use client"

import React from 'react';

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
    'A': 'bg-purple-500',
    'A#': 'bg-purple-600',
    'B': 'bg-pink-500'
  };
  
  return colorMap[baseNote] || 'bg-gray-500';
};

export default function NoteColorLegend() {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  return (
    <div className="mt-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Note Color Legend</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {notes.map((note) => (
          <div key={note} className="flex items-center">
            <div className={`w-6 h-6 rounded-full ${getNoteColor(note)} mr-2`}></div>
            <span className="text-sm font-medium">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 