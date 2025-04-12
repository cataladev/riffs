"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getRiff, Riff, RiffNote } from "../lib/riffStore"

// Simplified keyboard mapping - just use 4 keys for a basic rhythm game
const keyToPitch: Record<string, string> = {
  "a": "C4", 
  "s": "D4", 
  "d": "E4", 
  "f": "F4"
}

// Reverse mapping for display purposes
const pitchToKey: Record<string, string> = Object.entries(keyToPitch).reduce(
  (acc, [key, pitch]) => ({ ...acc, [pitch]: key }), 
  {}
)

export default function KeyboardPlayRiff() {
  const router = useRouter()
  const riff = getRiff()
  const [isPlaying, setIsPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [missedNotes, setMissedNotes] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [timeSteps, setTimeSteps] = useState<number[]>([])
  const [notes, setNotes] = useState<RiffNote[]>([])
  const [bpm, setBpm] = useState(120)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [hitNotes, setHitNotes] = useState<string[]>([])
  const [missedNotesList, setMissedNotesList] = useState<string[]>([])
  const [accuracy, setAccuracy] = useState(100)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const playIntervalRef = useRef<number | null>(null)
  const gameTimeoutRef = useRef<number | null>(null)
  const [activeNotes, setActiveNotes] = useState<{id: string, pitch: string, position: number}[]>([])
  const gameContainerRef = useRef<HTMLDivElement>(null)

  // Initialize the game
  useEffect(() => {
    if (!riff) {
      console.log("No riff found, redirecting to create page")
      router.push("/create")
      return
    }

    console.log("Riff loaded:", riff)
    console.log("Riff notes:", riff.notes)

    // Map the riff notes to our simplified key set
    let mappedNotes = riff.notes.map(note => {
      // Map the original pitch to one of our four keys
      const pitchMap: Record<string, string> = {
        "C4": "C4", "C#4": "C4", "D4": "D4", "D#4": "D4", 
        "E4": "E4", "F4": "F4", "F#4": "F4", "G4": "F4",
        "G#4": "F4", "A4": "F4", "A#4": "F4", "B4": "F4",
        "C3": "C4", "C#3": "C4", "D3": "D4", "D#3": "D4",
        "E3": "E4", "F3": "F4", "F#3": "F4", "G3": "F4",
        "G#3": "F4", "A3": "F4", "A#3": "F4", "B3": "F4",
        "C2": "C4", "C#2": "C4", "D2": "D4", "D#2": "D4",
        "E2": "E4", "F2": "F4", "F#2": "F4", "G2": "F4",
        "G#2": "F4", "A2": "F4", "A#2": "F4", "B2": "F4"
      }
      
      return {
        ...note,
        pitch: pitchMap[note.pitch] || "C4" // Default to C4 if no mapping found
      }
    })
    
    // If no notes are available, add some sample notes for testing
    if (mappedNotes.length === 0) {
      console.log("No notes found, adding sample notes")
      mappedNotes = [
        { id: "sample1", pitch: "C4", time: 4 },
        { id: "sample2", pitch: "D4", time: 8 },
        { id: "sample3", pitch: "E4", time: 12 },
        { id: "sample4", pitch: "F4", time: 16 },
        { id: "sample5", pitch: "C4", time: 20 },
        { id: "sample6", pitch: "D4", time: 24 },
        { id: "sample7", pitch: "E4", time: 28 },
        { id: "sample8", pitch: "F4", time: 32 }
      ]
    }
    
    setNotes(mappedNotes)
    setBpm(riff.bpm || 120)
    
    // Calculate time steps based on BPM
    const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4
    const totalSteps = Math.max(...mappedNotes.map(note => note.time)) + 16
    const timeStepsArray = Array.from({ length: totalSteps }, (_, i) => i)
    setTimeSteps(timeStepsArray)
    
    console.log("Initialized game with notes:", mappedNotes)
    console.log("Total steps:", totalSteps)
  }, [riff, router, bpm])

  // Handle keyboard input
  useEffect(() => {
    if (!isPlaying) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const pitch = keyToPitch[key]
      
      console.log("Key pressed:", key, "Pitch:", pitch)
      
      if (!pitch) return
      
      // Check if there's a note at the current step with this pitch
      const noteAtCurrentStep = notes.find(
        note => note.pitch === pitch && 
        Math.abs(note.time - currentStep) <= 1 // Allow for a small timing window
      )
      
      console.log("Note at current step:", noteAtCurrentStep)
      
      if (noteAtCurrentStep) {
        // Hit the note
        console.log("Hit note:", noteAtCurrentStep)
        setHitNotes(prev => [...prev, noteAtCurrentStep.id])
        setScore(prev => prev + 100)
        setStreak(prev => {
          const newStreak = prev + 1
          if (newStreak > maxStreak) {
            setMaxStreak(newStreak)
          }
          return newStreak
        })
      } else {
        // Missed the note
        console.log("Missed note for pitch:", pitch)
        setMissedNotes(prev => prev + 1)
        setMissedNotesList(prev => [...prev, `${pitch} at step ${currentStep}`])
        setStreak(0)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, currentStep, notes, maxStreak])

  // Update accuracy when hit or missed notes change
  useEffect(() => {
    const totalNotes = hitNotes.length + missedNotes
    if (totalNotes > 0) {
      const newAccuracy = Math.round((hitNotes.length / totalNotes) * 100)
      setAccuracy(newAccuracy)
    }
  }, [hitNotes, missedNotes])

  // Update active notes based on current step
  useEffect(() => {
    if (!isPlaying) return
    
    console.log("Updating active notes for step:", currentStep)
    
    // Find notes that should be active at the current step
    const currentNotes = notes.filter(note => {
      // Notes that are within a certain range of the current step
      return note.time >= currentStep - 8 && note.time <= currentStep + 8
    })
    
    console.log("Current notes:", currentNotes)
    
    // Map notes to their visual positions
    const mappedNotes = currentNotes.map(note => {
      // Calculate position (0-100%) based on time difference
      const timeDiff = note.time - currentStep
      // Adjust the position calculation to make notes fall more visibly
      const position = 100 - (timeDiff * 10) // 10% per step for more visible movement
      
      return {
        id: note.id,
        pitch: note.pitch,
        position: Math.max(0, Math.min(100, position))
      }
    })
    
    console.log("Mapped notes:", mappedNotes)
    setActiveNotes(mappedNotes)
    
    // Check for missed notes at the current step
    const missedNotesAtStep = notes.filter(note => 
      note.time < currentStep - 1 && 
      !hitNotes.includes(note.id) &&
      !missedNotesList.includes(`${note.pitch} at step ${note.time}`)
    )
    
    if (missedNotesAtStep.length > 0) {
      // Add missed notes to the list
      const newMissedNotes = missedNotesAtStep.map(note => 
        `${note.pitch} at step ${note.time}`
      )
      setMissedNotesList(prev => [...prev, ...newMissedNotes])
      setMissedNotes(prev => prev + missedNotesAtStep.length)
      setStreak(0)
    }
  }, [isPlaying, currentStep, notes, hitNotes, missedNotesList])

  // Start the game
  const startGame = () => {
    console.log("Starting game...")
    setIsPlaying(true)
    setGameStarted(true)
    setGameOver(false)
    setScore(0)
    setMissedNotes(0)
    setHitNotes([])
    setMissedNotesList([])
    setAccuracy(100)
    setStreak(0)
    setCurrentStep(0)
    
    // Calculate the interval between steps based on BPM
    const stepDuration = (60 / bpm) * 1000 / 4 // 4 steps per beat
    console.log("Step duration:", stepDuration, "ms")
    console.log("BPM:", bpm)
    console.log("Total steps:", timeSteps.length)
    
    // Log the notes to verify they're being loaded
    console.log("Starting game with notes:", notes)
    
    playIntervalRef.current = window.setInterval(() => {
      setCurrentStep(prevStep => {
        const nextStep = prevStep + 1
        console.log("Current step:", nextStep)
        
        // Check if we've reached the end of the riff
        if (nextStep >= timeSteps.length) {
          console.log("Reached end of riff, stopping game")
          stopGame()
          return prevStep
        }
        
        return nextStep
      })
    }, stepDuration)
    
    // Set a timeout to end the game after the riff is complete
    const totalDuration = (timeSteps.length * 60 / bpm) * 1000 / 4
    console.log("Total game duration:", totalDuration, "ms")
    gameTimeoutRef.current = window.setTimeout(() => {
      console.log("Game timeout reached, stopping game")
      stopGame()
    }, totalDuration + 2000) // Add 2 seconds buffer
  }

  // Stop the game
  const stopGame = () => {
    setIsPlaying(false)
    setGameOver(true)
    
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    
    if (gameTimeoutRef.current) {
      clearTimeout(gameTimeoutRef.current)
      gameTimeoutRef.current = null
    }
  }

  // Restart the game
  const restartGame = () => {
    startGame()
  }

  // Return to the main menu
  const returnToMenu = () => {
    router.push("/play")
  }

  if (!riff) {
    return (
      <div className="p-8 text-red-300">
        ⚠️ No riff loaded. Go record one first at <a href="/create" className="underline">/create</a>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-black">🎹 Keyboard Rhythm Game</h1>
      <p className="text-black/80 mb-4">
        Session: <code className="bg-gray-200 px-2 py-1 rounded">{riff.recording}</code>
      </p>
      <p className="text-black/80 mb-4">
        Notes: <code className="bg-gray-200 px-2 py-1 rounded">{notes.length}</code>
      </p>

      {/* Game status */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Score</h3>
          <p className="text-2xl font-bold text-blue-900">{score}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Accuracy</h3>
          <p className="text-2xl font-bold text-green-900">{accuracy}%</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Streak</h3>
          <p className="text-2xl font-bold text-yellow-900">{streak}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Max Streak</h3>
          <p className="text-2xl font-bold text-purple-900">{maxStreak}</p>
        </div>
      </div>

      {/* Game controls */}
      <div className="mb-6">
        {!gameStarted ? (
          <button 
            onClick={startGame}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-lg font-semibold"
          >
            Start Game
          </button>
        ) : isPlaying ? (
          <button 
            onClick={stopGame}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-lg font-semibold"
          >
            Stop Game
          </button>
        ) : (
          <div className="flex space-x-4">
            <button 
              onClick={restartGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-lg font-semibold"
            >
              Play Again
            </button>
            <button 
              onClick={returnToMenu}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-lg font-semibold"
            >
              Return to Menu
            </button>
          </div>
        )}
      </div>

      {/* Game over screen */}
      {gameOver && (
        <div className="mb-6 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-black">Game Over!</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Final Score</h3>
              <p className="text-3xl font-bold text-blue-600">{score}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Accuracy</h3>
              <p className="text-3xl font-bold text-green-600">{accuracy}%</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Notes Hit</h3>
              <p className="text-3xl font-bold text-blue-600">{hitNotes.length}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Notes Missed</h3>
              <p className="text-3xl font-bold text-red-600">{missedNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Game visualization */}
      {isPlaying && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-black">Game Play</h2>
          <div 
            ref={gameContainerRef}
            className="bg-gray-800 rounded-lg overflow-hidden relative"
            style={{ height: "400px" }}
          >
            {/* Target line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white z-10"></div>
            
            {/* Note columns */}
            <div className="absolute inset-0 flex">
              {Object.keys(pitchToKey).map((pitch, index) => (
                <div 
                  key={pitch} 
                  className="flex-1 border-r border-gray-700 last:border-r-0"
                >
                  {/* Key label at the bottom */}
                  <div className="absolute bottom-2 left-0 right-0 text-center text-white font-bold">
                    {pitchToKey[pitch]}
                  </div>
                  
                  {/* Note falling down */}
                  {activeNotes
                    .filter(note => note.pitch === pitch)
                    .map(note => (
                      <div
                        key={note.id}
                        className={`absolute w-full h-8 rounded-md ${
                          hitNotes.includes(note.id) 
                            ? 'bg-green-500' 
                            : 'bg-blue-500'
                        }`}
                        style={{
                          bottom: `${note.position}%`,
                          left: `${(index * 100) / Object.keys(pitchToKey).length}%`,
                          width: `${100 / Object.keys(pitchToKey).length}%`,
                          transition: 'bottom 0.05s linear'
                        }}
                      ></div>
                    ))
                  }
                </div>
              ))}
            </div>
            
            {/* Current step indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-white/20 z-5"></div>
            
            {/* Debug info */}
            <div className="absolute top-0 left-0 bg-black/50 text-white p-2 text-xs">
              Step: {currentStep} | Notes: {activeNotes.length}
            </div>
          </div>
        </div>
      )}

      {/* Game status indicator */}
      {isPlaying && (
        <div className="mb-6 p-4 bg-green-100 rounded-lg">
          <h2 className="text-xl font-semibold text-green-800">Game is Running</h2>
          <p className="text-green-700">Press the corresponding keys (A, S, D, F) when notes reach the bottom line.</p>
        </div>
      )}

      {/* Keyboard layout */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-black">Keyboard Layout</h2>
        <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-4 gap-1">
              {Object.entries(pitchToKey).map(([pitch, key]) => (
                <div 
                  key={pitch} 
                  className="p-2 text-center rounded bg-gray-700 text-white"
                >
                  <div className="font-mono text-sm">{key}</div>
                  <div className="text-xs">{pitch}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game instructions */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-black">How to Play</h2>
        <ul className="list-disc pl-5 text-black/80 space-y-1">
          <li>Press the corresponding key when a note reaches the bottom of the screen</li>
          <li>Hit notes to increase your score and maintain your streak</li>
          <li>Missing notes will reset your streak</li>
          <li>Try to achieve 100% accuracy!</li>
        </ul>
      </div>

      {/* Missed notes list */}
      {gameOver && missedNotesList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-black">Missed Notes</h2>
          <div className="bg-red-50 p-4 rounded-lg max-h-40 overflow-y-auto">
            <ul className="list-disc pl-5 text-red-800">
              {missedNotesList.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to determine if a note is an accidental (sharp)
const isAccidental = (note: string): boolean => {
  return note.includes('#')
} 