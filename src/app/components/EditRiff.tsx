"use client"

import { useEffect, useState, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { playNote, stopAllSounds, initAudioContext } from "../lib/audioService"
import { useRouter } from "next/navigation"
import CoolButton from "./coolbutton"
import CoolButton2 from "./coolbutton2"
import { Play, Pause, Plus, Minus, Guitar } from "lucide-react"

// Define the EditRiffProps interface
interface EditRiffProps {
  riff: {
    id: string
    name: string
    notes: Note[]
    bpm: number
    recording?: string
  }
  onSave: (updatedRiff: {
    id: string
    name: string
    notes: Note[]
    bpm: number
    recording?: string
  }) => void
  onCancel: () => void
}

type Note = {
  id: string
  pitch: string
  time: number
}

// Define vertical axis (pitches) for the piano roll, with highest pitches at the top.
// Include all available notes from the piano audio files
const pitches = [
  "C5", "B4", "A#4", "A4", "G#4", "G4", "F#4", "F4", "E4", "D#4", "D4", "C#4", "C4", "B3", 
  "A#3", "A3", "G#3", "G3", "F#3", "F3", "E3", "D#3", "D3", "C#3", "C3", "B2", "A#2", "A2", 
  "G#2", "G2", "F#2", "F2", "E2"
]

// Helper function to get time steps based on BPM and number of beats
function getTimeSteps(bpm: number, numBeats: number = 16): number[] {
  // Calculate how many steps per beat based on BPM
  // For faster tempos, we use fewer steps per beat to keep the grid manageable
  const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4
  
  // Calculate total number of steps
  const totalSteps = numBeats * stepsPerBeat
  
  // Create an array of step numbers
  return Array.from({ length: totalSteps }, (_, i) => i)
}

// Helper function to determine if a note is an accidental (sharp)
const isAccidental = (note: string): boolean => {
  return note.includes('#')
}

export default function EditRiff({ riff, onSave, onCancel }: EditRiffProps) {
  const [notes, setNotes] = useState<Note[]>(riff.notes)
  const [bpm] = useState(riff.bpm)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [timeSteps, setTimeSteps] = useState<number[]>([])
  const [numBeats, setNumBeats] = useState(calculateInitialBeats(riff.notes, riff.bpm))
  const playIntervalRef = useRef<number | null>(null)
  const router = useRouter()

  // Helper function to calculate initial number of beats based on notes
  function calculateInitialBeats(notes: Note[], bpm: number): number {
    if (notes.length === 0) return 16; // Default if no notes
    
    // Find the maximum time value in the notes
    const maxTime = Math.max(...notes.map(note => note.time));
    
    // Calculate how many steps per beat based on BPM
    const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4;
    
    // Calculate the number of beats needed (round up to the nearest multiple of 4)
    const calculatedBeats = Math.ceil(maxTime / stepsPerBeat) + 2;
    return Math.max(16, Math.ceil(calculatedBeats / 4) * 4);
  }

  // Calculate the number of beats needed based on the notes
  useEffect(() => {
    if (notes.length > 0) {
      // Find the maximum time value in the notes
      const maxTime = Math.max(...notes.map(note => note.time));
      
      // Calculate how many steps per beat based on BPM
      const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4;
      
      // Calculate the number of beats needed (round up to the nearest multiple of 4)
      const calculatedBeats = Math.ceil(maxTime / stepsPerBeat) + 2;
      const newNumBeats = Math.max(16, Math.ceil(calculatedBeats / 4) * 4);
      
      setNumBeats(newNumBeats);
    }
  }, [notes, bpm]);

  // Initialize time steps based on BPM and number of beats
  useEffect(() => {
    setTimeSteps(getTimeSteps(bpm, numBeats))
  }, [bpm, numBeats])

  // Handle adding more beats
  const handleAddBeats = () => {
    // Add 4 beats at a time
    const newNumBeats = numBeats + 4
    setNumBeats(newNumBeats)
    setTimeSteps(getTimeSteps(bpm, newNumBeats))
  }

  // Handle removing beats
  const handleRemoveBeats = () => {
    // Remove 4 beats at a time, but don't go below 16
    if (numBeats > 16) {
      const newNumBeats = numBeats - 4
      setNumBeats(newNumBeats)
      setTimeSteps(getTimeSteps(bpm, newNumBeats))
      
      // Remove notes that are beyond the new beat count
      const cellsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4
      const maxTime = newNumBeats * cellsPerBeat - 1
      
      setNotes(prev => prev.filter(note => note.time <= maxTime))
    }
  }

  // Move a note to a new pitch and time cell
  const handleMoveNote = (id: string, newPitch: string, newTime: number) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, pitch: newPitch, time: newTime } : note
      )
    )
  }

  // Handle cell click - either add a note or delete an existing one
  const handleCellClick = (pitch: string, time: number) => {
    // Check if there's already a note at this position
    const existingNoteIndex = notes.findIndex(note => note.time === time && note.pitch === pitch);
    
    if (existingNoteIndex >= 0) {
      // If there's a note, remove it
      const updatedNotes = [...notes];
      updatedNotes.splice(existingNoteIndex, 1);
      setNotes(updatedNotes);
    } else {
      // If there's no note, add one
      const newNote = {
        id: uuidv4(),
        pitch,
        time
      };
      setNotes([...notes, newNote]);
      
      // Play the note sound
      playNote(pitch);
    }
  }


  const handleSaveNotes = () => {
    const updatedRiff = {
      ...riff,
      notes,
      bpm
    }
    onSave(updatedRiff)
  }

  // Send notes to play page
  const handleSendAndPlay = () => {
    // Sort notes by time to ensure correct playback order
    const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
    
    // Extract just the pitches from the notes
    const notePitches = sortedNotes.map(note => note.pitch);
    
    // Convert to URL parameters
    const notesParam = encodeURIComponent(JSON.stringify(notePitches));
    const bpmParam = encodeURIComponent(bpm.toString());
    
    // Navigate to play page with notes and BPM
    router.push(`/play?notes=${notesParam}&bpm=${bpmParam}`);
  };

  // Initialize audio context when component mounts
  useEffect(() => {
    // Initialize audio context on user interaction
    const handleUserInteraction = () => {
      initAudioContext();
      // Remove event listeners after initialization
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Play the riff
  const playRiff = () => {
    if (isPlaying) {
      stopRiff()
      return
    }
    
    setIsPlaying(true)
    setCurrentStep(0)
    
    // Calculate the interval between steps based on BPM
    const stepDuration = (60 / bpm) * 1000 / 4 // 4 steps per beat
    
    // Play the notes at the current step
    const playNotesAtStep = (step: number) => {
      // Find all notes at the current step
      const notesAtStep = notes.filter(note => note.time === step);
      
      // Play each note
      notesAtStep.forEach(note => {
        playNote(note.pitch);
      });
    };
    
    // Play notes at the initial step
    playNotesAtStep(0);
    
    playIntervalRef.current = window.setInterval(() => {
      setCurrentStep(prevStep => {
        const nextStep = (prevStep + 1) % timeSteps.length;
        // Play notes at the new step
        playNotesAtStep(nextStep);
        return nextStep;
      });
    }, stepDuration);
  }

  // Stop playing
  const stopRiff = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    
    // Stop all currently playing sounds
    stopAllSounds();
  }

  return (
  <div className="p-8 max-w-6xl mx-auto">
   
   <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#9722b6] to-[#fe5b35] bg-clip-text text-transparent flex items-center gap-2">
    🔧 Edit Your Riff (Piano Roll)
    </h1>


    {/* BPM Display */}
    <div className="mb-6 flex items-center">
      <span className="mr-2 text-[#fe5b35] font-bold">BPM: {bpm}</span>
      <span className="text-sm text-gray-500">
        (automatically detected from your recording)
      </span>
    </div>

    {/* Top controls */}
    <div className="mb-6 flex items-center justify-normal gap-12">
      <CoolButton
        onClick={handleAddBeats}
        label="Add 4 beats"
        className="text-sm px-4 py-2"
        iconRight={<Plus size={16} />}
      />

      <CoolButton2
        onClick={handleRemoveBeats}
        label="Remove 4 beats"
        className={`text-sm px-4 py-2 ${
          numBeats <= 16 ? "opacity-40 cursor-not-allowed" : ""
        }`}
        iconRight={<Minus size={16} />}
      />

      <CoolButton
        onClick={playRiff}
        label={isPlaying ? "Pause" : "Play"}
        className="text-sm px-4 py-2"
        iconRight={isPlaying ? <Pause size={16} /> : <Play size={16} />}
      />

      <CoolButton2
        onClick={handleSendAndPlay}
        label="Submit and Play •၊၊||၊|။||||။၊|။•"
        className="text-sm px-4 py-2"
      />
    </div>


    {/* Current length display below buttons */}
    <div className="mb-6 text-center">
      <span className="text-sm text-gray-600 font-medium">
        Current length: {numBeats} beats
      </span>
    </div>

    {/* Scrollable container for the piano roll grid */}
    <div className="overflow-auto border border-gray-200 rounded-lg shadow-md">
      <div className="inline-block">
        {/* Beat markers row */}
        <div className="flex">
          <div className="w-14 h-8 border border-gray-200 flex items-center justify-center bg-gray-50 text-gray-700 text-sm font-mono">
            Beats
          </div>
          {timeSteps.map((step) => {
            const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4;
            const beatNumber = Math.floor(step / stepsPerBeat) + 1;
            const isBeatMarker = step % stepsPerBeat === 0;

            return (
              <div
                key={`beat-${step}`}
                className={`w-14 h-8 border border-gray-200 flex items-center justify-center ${
                  currentStep === step
                    ? "bg-gradient-to-r from-[#fe5b35]/20 to-[#9722b6]/20 text-gray-800 font-bold"
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                {isBeatMarker ? beatNumber : ""}
              </div>
            );
          })}
        </div>

        {/* Piano roll grid */}
        {pitches.map((pitch) => (
          <div key={pitch} className="flex">
            {/* Pitch label */}
            <div
              className={`w-14 h-12 border border-gray-200 flex items-center justify-center ${
                isAccidental(pitch)
                  ? "bg-gray-100 text-gray-700"
                  : "bg-gray-50 text-gray-800"
              } text-sm font-mono`}
            >
              {pitch}
            </div>

            {/* Time steps */}
            {timeSteps.map((step) => {
              const note = notes.find(
                (n) => n.pitch === pitch && n.time === step
              );

              return (
                <div
                  key={step}
                  className={`w-14 h-12 border border-gray-200 flex items-center justify-center relative ${
                    currentStep === step
                      ? "bg-gradient-to-r from-[#fe5b35]/10 to-[#9722b6]/10"
                      : "bg-white"
                  } hover:bg-gray-50 cursor-pointer transition-colors`}
                  onClick={() => handleCellClick(pitch, step)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const noteId = e.dataTransfer.getData("text/plain");
                    handleMoveNote(noteId, pitch, step);
                  }}
                >
                  {note && (
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", note.id);
                        setSelectedNote(note);
                      }}
                      onDragEnd={() => setSelectedNote(null)}
                      className={`w-6 h-6 rounded-full cursor-move shadow-md ${
                        selectedNote === note
                          ? "bg-gradient-to-r from-[#fe5b35] to-[#eb3d5f]"
                          : isAccidental(pitch)
                          ? "bg-gradient-to-r from-[#9722b6] to-[#eb3d5f]"
                          : "bg-gradient-to-r from-[#fe5b35] to-[#9722b6]"
                      }`}
                      title={`Pitch ${pitch}, Beat ${
                        Math.floor(step / (bpm > 160 ? 1 : bpm > 120 ? 2 : 4)) +
                        1
                      }`}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>

    {/* Riff Notes list
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-[#fe5b35] to-[#9722b6] bg-clip-text text-transparent">
        📝 Riff Notes
      </h2>
      <ul className="text-sm text-gray-700 space-y-1">
        {notes.map((note) => (
          <li
            key={note.id}
            className="bg-gray-50 p-2 rounded-md border border-gray-200"
          >
            Pitch{" "}
            <strong className="text-[#9722b6]">{note.pitch}</strong> – Beat{" "}
            <strong className="text-[#fe5b35]">
              {Math.floor(note.time / (bpm > 160 ? 1 : bpm > 120 ? 2 : 4)) + 1}
            </strong>
          </li>
        ))}
      </ul>
    </div> */}

    {/* Cancel Button */}
    <div className="flex justify-end mt-8">
      <CoolButton
        onClick={onCancel}
        label="Cancel"
        className="from-gray-100 to-gray-200 text-gray-700 text-sm px-5 py-2"
      />
    </div>
  </div>
);

}
