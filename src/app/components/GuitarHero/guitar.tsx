"use client";

import { useRef, useState, useEffect } from 'react';

const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const FRET_COUNT = 24;

export default function Guitar() {
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
            <div className="relative w-full max-w-4xl mx-auto right-1/20" style={{ marginTop: '-430px' }} ref={fretboardRef}>
                {/* Fret markers */}
                <div className="absolute top-0 bottom-0 w-1 bg-gray-800 z-10" style={{ left: `${labelWidth}px` }}></div>
                {[...Array(FRET_COUNT)].map((_, fretIndex) => (
                    <div
                        key={fretIndex}
                        className="absolute top-0 bottom-0 w-px bg-gray-300 z-10"
                        style={{ left: `${labelWidth + fretSpacing * (fretIndex + 1)}px` }}
                    ></div>
                ))}
                {/* String labels and strings */}
                {STANDARD_TUNING.map((stringNote: string, stringIndex: number) => (
                    <div key={stringIndex} className="absolute w-full" style={{ top: `${stringIndex * 36 + 10}px` }}>
                        <div className="absolute left-0 text-center font-bold text-gray-700" style={{ width: `${labelWidth}px` }}>
                            {stringNote.replace(/\d+$/, '')}
                        </div>
                        <div className={`absolute h-px ${stringIndex < 3 ? 'bg-gray-500' : 'bg-gray-400'} z-1`} 
                             style={{ left: `${labelWidth}px`, right: '0' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

