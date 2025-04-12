"use client"

import { useEffect, useState, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
import { playNote, playNoteSequence, stopAllSounds, initAudioContext } from "../lib/audioService"

// Define the EditRiffProps interface
interface EditRiffProps {
  riff: {
    id: string
    name: string
    notes: Note[]
    bpm: number
    recording?: string
  }
  onSave: (updatedRiff: any) => void
  onCancel: () => void
}

type Note = {
  id: string
  pitch: string
  time: number
}

// Define vertical axis (pitches) for the piano roll, with highest pitches at the top.
// Include only the notes in E standard tuning (E, A, D, G, B, E) with sharps
const pitches = [
  "E4", "D#4", "D4", "C#4", "C4", "B3", "A#3", "A3", "G#3", "G3", "F#3", "F3", "E3",
  "D#3", "D3", "C#3", "C3", "B2", "A#2", "A2", "G#2", "G2", "F#2", "F2", "E2"
]

// Default BPM
const DEFAULT_BPM = 120

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

// Map of note names to frequencies (in Hz)
const noteFrequencies: Record<string, number> = {
  "E4": 329.63, "D#4": 311.13, "D4": 293.66, "C#4": 277.18, "C4": 261.63, 
  "B3": 246.94, "A#3": 233.08, "A3": 220.00, "G#3": 207.65, "G3": 196.00, 
  "F#3": 185.00, "F3": 174.61, "E3": 164.81, 
  "D#3": 155.56, "D3": 146.83, "C#3": 138.59, "C3": 130.81, 
  "B2": 123.47, "A#2": 116.54, "A2": 110.00, "G#2": 103.83, 
  "G2": 98.00, "F#2": 92.50, "F2": 87.31, "E2": 82.41
}

// Helper function to determine if a note is an accidental (sharp)
const isAccidental = (note: string): boolean => {
  return note.includes('#')
}

export default function EditRiff({ riff, onSave, onCancel }: EditRiffProps) {
  const [notes, setNotes] = useState<Note[]>(riff.notes)
  const [bpm, setBpm] = useState(riff.bpm)
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

  // Handle BPM change
  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm)
    setTimeSteps(getTimeSteps(newBpm, numBeats))
  }

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

  // Delete a note from state
  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
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

  // Save the current notes
  const handleSaveNotes = () => {
    const updatedRiff = {
      ...riff,
      notes,
      bpm
    }
    onSave(updatedRiff)
  }

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

  // Add a function to play a single note when clicked
  const handleNoteClick = (pitch: string) => {
    playNote(pitch);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-black">🛠️ Edit Your Riff (Piano Roll)</h1>
      <p className="text-black/80 mb-4">
        Session: <code className="bg-gray-200 px-2 py-1 rounded">{riff.recording}</code>
      </p>

      {/* BPM Display */}
      <div className="mb-6 flex items-center">
        <span className="mr-2 text-black font-medium">BPM: {bpm}</span>
        <span className="text-sm text-gray-500">(automatically detected from your recording)</span>
      </div>

      {/* Beat controls */}
      <div className="mb-4 flex items-center space-x-4">
        <button 
          onClick={handleAddBeats}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
        >
          + Add 4 beats
        </button>
        
        <button 
          onClick={handleRemoveBeats}
          className={`px-3 py-1 rounded transition text-sm ${
            numBeats > 16 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          disabled={numBeats <= 16}
        >
          - Remove 4 beats
        </button>
        
        <span className="text-sm text-gray-500">Current length: {numBeats} beats</span>

        {/* Play button */}
        <button
          onClick={playRiff}
          className={`px-4 py-1 rounded transition text-sm ${
            isPlaying
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>
      </div>

      {/* Scrollable container for the piano roll grid */}
      <div className="overflow-auto">
        <div className="inline-block border border-gray-600">
          {/* Beat markers row */}
          <div className="flex">
            <div className="w-14 h-8 border border-gray-700 flex items-center justify-center bg-gray-800 text-white text-sm font-mono">
              Beats
            </div>
            {timeSteps.map((step) => {
              // Calculate the beat number for this step
              const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4
              const beatNumber = Math.floor(step / stepsPerBeat) + 1
              const isBeatMarker = step % stepsPerBeat === 0
              
              // Only show beat markers
              return (
                <div 
                  key={`beat-${step}`} 
                  className={`w-14 h-8 border border-gray-700 flex items-center justify-center ${
                    currentStep === step ? 'bg-gray-700 text-white font-bold' : 'bg-gray-800 text-white/50'
                  }`}
                >
                  {isBeatMarker ? beatNumber : ''}
                </div>
              )
            })}
          </div>

          {/* Piano roll grid */}
          {pitches.map((pitch) => (
            <div key={pitch} className="flex">
              {/* Left side label cell */}
              <div className={`w-14 h-12 border border-gray-700 flex items-center justify-center ${
                isAccidental(pitch) ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
              } text-sm font-mono`}>
                {pitch}
              </div>

              {/* Time steps cells */}
              {timeSteps.map((step) => {
                // Find if a note exists on this cell
                const note = notes.find((n) => n.pitch === pitch && n.time === step)
                return (
                  <div
                    key={step}
                    className={`w-14 h-12 border border-gray-700 flex items-center justify-center relative ${
                      currentStep === step ? 'bg-gray-100' : 'bg-white'
                    } hover:bg-gray-200 cursor-pointer`}
                    onClick={() => handleCellClick(pitch, step)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const noteId = e.dataTransfer.getData("text/plain")
                      handleMoveNote(noteId, pitch, step)
                    }}
                  >
                    {note && (
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", note.id)
                          setSelectedNote(note)
                        }}
                        onDragEnd={() => setSelectedNote(null)}
                        className={`w-6 h-6 rounded-full cursor-move ${
                          selectedNote === note ? 'bg-red-500' : isAccidental(pitch) ? 'bg-purple-400' : 'bg-yellow-400'
                        }`}
                        title={`Pitch ${pitch}, Beat ${Math.floor(step / (bpm > 160 ? 1 : bpm > 120 ? 2 : 4)) + 1}`}
                      ></div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2 text-black">📝 Riff Notes</h2>
        <ul className="text-sm text-black/80">
          {notes.map((note) => (
            <li key={note.id}>
              Pitch <strong>{note.pitch}</strong> – Beat <strong>{Math.floor(note.time / (bpm > 160 ? 1 : bpm > 120 ? 2 : 4)) + 1}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between mt-4">
        <button 
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
        >
          Cancel
        </button>
        <button 
          onClick={handleSaveNotes}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Save
        </button>
      </div>
    </div>
  )
}
