"use client"

import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from "react"
import * as Tone from "tone"

type NumberedNotePosition = {
  string: number,
  fret: number
}

const OCTAVE_EXTRACTOR = /\d+$/ // regex to match octave; e.g. if we have A#4 it matches the 4 

const FRET_COUNT = 12 // frets in a normal guitar

// 6-string std. tuning
const STANDARD_TUNING = [
  "E2",
  "A2",
  "D3",
  "G3",
  "B3",
  "E4"
]

/// Give fretboard coordinates (string, fret #) to get note back
function getNoteAtPosition(stringNote: string, fret: number) {
  const notes = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B'
  ];

  const baseNote = stringNote.replace(OCTAVE_EXTRACTOR, "") // replace octave for whitespace, e.g. A#4 -> A#
  const octave = parseInt(stringNote.match(OCTAVE_EXTRACTOR)?.[0] || "4") // match and set octave; if no octave found, default to 4

  // find index of base note in notes array
  const baseNoteIndex = notes.findIndex((n) => n === baseNote)

  // get new note index and its octave
  const halfStepsUp = baseNoteIndex + fret
  const newNoteIndex = halfStepsUp % 12 // moves frets up from base note; wrap around if exceed frets 

  const octaveChange = Math.floor(halfStepsUp / 12) // get amt octaves we went up
  const newOctave = octave + octaveChange // calculate final octave

  // return composite final note
  return `${notes[newNoteIndex]}${newOctave}`
}

function getAllPositionsForNote(note: string): NumberedNotePosition[] {
  const positions: NumberedNotePosition[] = []

  // separate base note and octave; NOTE: octave must be in numeric form!
  const baseNote = note.replace(OCTAVE_EXTRACTOR, "")
  const octave = parseInt(note.match(OCTAVE_EXTRACTOR)?.[0] || "4")

  // for each big string (std. tuning)...
  STANDARD_TUNING.forEach((stringNote, stringIndex) => {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      // get note at this fret in this string
      const noteAtPos = getNoteAtPosition(stringNote, fret)

      // check if getNoteAtPosition returned a valid note
      if (noteAtPos) {
        // separate its note and octave
        const posBaseNote = noteAtPos.replace(OCTAVE_EXTRACTOR, "")
        const posOctave = parseInt(noteAtPos.match(OCTAVE_EXTRACTOR)?.[0] || "4")

        // if it matches the param note, this is a pos for this note!
        if (posBaseNote === baseNote && posOctave === octave) {
          positions.push({
            string: stringIndex,
            fret: fret
          })
        }
      }
    }
  })

  return positions
}

function getNoteColor(note: string) {
  // note bg colors
  const noteColorMap: Record<string, string> = {
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
  }

  // get base note and use it to index the color map
  const baseNote = note.replace(OCTAVE_EXTRACTOR, "")

  // return the obtained color
  return noteColorMap[baseNote] ?? "bg-gray-500"
}

export default const FretboardVisualizer = () => {
  const [notes, setNotes] = useState(["E4", "G4", "B4", "E5", "D5", "B4"]) // the notes to play
  const [tempo, setTempo] = useState(140) // the tempo at which to play
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1) // currently playing note idx 
  const [isPlaying, setIsPlaying] = useState(false) // is the audio playing?
  const [newNote, setNewNote] = useState("") // WARN: idk
  const synthRef = useRef(null) // ref to synth element
  const sequenceRef = useRef(null) // ref to sequence element


}
