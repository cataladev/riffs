"use client";

import React, { useState } from "react";
import * as Tone from "tone";

// standard tuning
const guitarStrings = [
  { name: "E2", baseNote: "E2" },
  { name: "A2", baseNote: "A2" },
  { name: "D3", baseNote: "D3" },
  { name: "G3", baseNote: "G3" },
  { name: "B3", baseNote: "B3" },
  { name: "E4", baseNote: "E4" },
];

const frets = 12;

const noteFrequencies: { [note: string]: number } = {
  "E2": 82.41, "F2": 87.31, "F#2": 92.50, "G2": 98.00, "G#2": 103.83, "A2": 110.00,
  "A#2": 116.54, "B2": 123.47, "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56,
  "E3": 164.81, "F3": 174.61, "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00,
  "A#3": 233.08, "B3": 246.94, "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13,
  "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00,
  "A#4": 466.16, "B4": 493.88, "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25,
  "E5": 659.26, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00,
  "A#5": 932.33, "B5": 987.77, "C6": 1046.50, "C#6": 1108.73, "D6": 1174.66, "D#6": 1244.51,
  "E6": 1318.51,
};

/// Get a note N frets up from a base note
function getNoteFrom(baseNote: string, fretsUp: number): string | null {
  // get list of notes
  const notes = Object.keys(noteFrequencies);

  // get index at which the base note is
  const index = notes.indexOf(baseNote);

  // validate index bounds
  if (index === -1 || index + fretsUp >= notes.length)
    return null;

  // return note with offset applied
  return notes[index + fretsUp];
}

const NotesPlayer: React.FC = () => {
  const [notes, setNotes] = useState<string[]>(["A3", "E4", "G4", "C5"]);
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);

  // interval between notes at set bpm
  const calculateInterval = (bpm: number) => 60 / bpm;

  const playNotes = async () => {
    setIsPlaying(true);

    // construct synth + connect to speaker
    const synth = new Tone.Synth().toDestination();

    // init synth 
    await Tone.start();

    // get interval
    const interval = calculateInterval(bpm);

    // go through notes list; set currently playing
    for (const note of notes) {
      // mark note as active (visual)
      setCurrentNote(note);

      // play note; attack = fade in, release = fade out; is 8th note
      // set duration to 4ters for now; TODO: match up w our tempo
      synth.triggerAttackRelease(noteFrequencies[note], "4n");

      // wait for interval until note is done playing
      await new Promise((res) => setTimeout(res, interval * 1000));
    }

    // clear note state 
    setCurrentNote(null);

    // not playing anymore
    setIsPlaying(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">🎸 Guitar Fretboard Note Player</h1>
      <div className="mb-4">
        <label className="block mb-2">
          BPM:
          <input
            type="number"
            className="ml-2 border px-2"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            disabled={isPlaying}
          />
        </label>
        <label className="block mb-2">
          Notes (comma-separated):
          <input
            type="text"
            className="ml-2 border px-2 w-64"
            value={notes.join(", ")}
            onChange={(e) =>
              setNotes(e.target.value.split(",").map((n) => n.trim()))
            }
            disabled={isPlaying}
          />
        </label>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded"
          onClick={playNotes}
          disabled={isPlaying}
        >
          {isPlaying ? "Playing..." : "Play Notes"}
        </button>
      </div>

      {/* Fretboard */}
      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1">
          {guitarStrings.map((string, i) => (
            <div key={i} className="flex items-center">
              <span className="w-12 text-right pr-2 font-mono">{string.name}</span>
              <div className="flex">
                {[...Array(frets + 1)].map((_, fret) => {
                  const note = getNoteFrom(string.baseNote, fret);
                  const isActive = note === currentNote;
                  return (
                    <div
                      key={fret}
                      className={`w-14 h-10 flex items-center justify-center border border-gray-400 ${isActive ? "bg-yellow-300 font-bold" : "bg-white"
                        }`}
                    >
                      {isActive ? note : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotesPlayer;
