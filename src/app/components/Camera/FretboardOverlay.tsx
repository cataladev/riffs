"use client";

import { useRef, useState, useEffect } from 'react';

const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const FRET_COUNT = 24;

export default function FretboardOverlay() {
  const [fretboardWidth, setFretboardWidth] = useState(0);
  const fretboardRef = useRef<HTMLDivElement>(null);
  const labelWidth = 40;

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

  // Calculate fret spacing
  const availableWidth = fretboardWidth ? fretboardWidth - labelWidth : 0;
  const fretSpacing = availableWidth / (FRET_COUNT + 1); // +1 to include the nut

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-rose-300 gradient-border opacity-90 relative w-full max-w-4xl mx-auto -bottom-1/5" style={{ marginTop: '-220px' }} ref={fretboardRef}>
        <div className="relative" style={{ height: '220px' }}>
          {/* Nut - thicker first vertical line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-rose-500 z-10"
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
              <div className="absolute text-center font-bold text-[#ef5151]" style={{ width: `${labelWidth}px` }}>
                {stringNote.replace(/\d+$/, '')}
              </div>

              {/* Actual String Line - continuous across all frets */}
              <div
                className={`absolute h-px ${stringIndex < 3 ? 'bg-gray-500' : 'bg-gray-400'} z-1`}
                style={{ left: `${labelWidth}px`, right: '0' }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 