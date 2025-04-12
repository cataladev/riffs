import React from 'react';

interface FretboardProps {
  activeNotes: string[];  // Array of currently active note pitches
  strings: string[];      // Array of string tunings (e.g., ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'])
  frets: number;          // Number of frets to display
}

const Fretboard: React.FC<FretboardProps> = ({ activeNotes, strings, frets }) => {
  const fretWidth = 60;
  const stringSpacing = 30;
  const nutWidth = 20;

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="flex" style={{ minWidth: `${nutWidth + frets * fretWidth}px` }}>
        {/* Nut */}
        <div className="flex flex-col" style={{ width: nutWidth }}>
          {strings.map((string, i) => (
            <div
              key={`nut-${i}`}
              className="border-r-2 border-gray-800 h-12 flex items-center justify-center"
              style={{ height: stringSpacing }}
            >
              <span className="text-xs font-bold">{string}</span>
            </div>
          ))}
        </div>

        {/* Frets */}
        {Array.from({ length: frets }).map((_, fretIndex) => (
          <div key={fretIndex} className="flex flex-col">
            {strings.map((string, stringIndex) => {
              const note = getNoteAtFret(string, fretIndex);
              const isActive = activeNotes.includes(note);
              
              return (
                <div
                  key={`fret-${fretIndex}-string-${stringIndex}`}
                  className={`border-r border-gray-600 h-12 flex items-center justify-center relative
                    ${isActive ? 'bg-blue-500 text-white' : ''}`}
                  style={{ height: stringSpacing }}
                >
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{note}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to calculate note at a given fret
function getNoteAtFret(stringNote: string, fret: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = parseInt(stringNote.slice(-1));
  const baseNote = stringNote.slice(0, -1);
  const baseIndex = notes.indexOf(baseNote);
  
  const newIndex = (baseIndex + fret) % 12;
  const octaveShift = Math.floor((baseIndex + fret) / 12);
  
  return `${notes[newIndex]}${octave + octaveShift}`;
}

export default Fretboard; 
