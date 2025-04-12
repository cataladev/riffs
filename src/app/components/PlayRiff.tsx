"use client"

import { useEffect, useState, useRef } from "react"
import { getRiff, RiffNote } from "../lib/riffStore"
import { useRouter } from "next/navigation"

// Define the available pitches in the piano roll
const availablePitches = [
  "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3",
  "A3", "G3", "F3", "E3", "D3", "C3", "B2", "A2", "G2", "F2", "E2"
]

// Map notes to colors for the game
const noteColors: Record<string, string> = {
  "E2": "#FF0000", // Red
  "F2": "#FF3300",
  "G2": "#FF6600",
  "A2": "#FF9900",
  "B2": "#FFCC00",
  "C3": "#FFFF00", // Yellow
  "D3": "#CCFF00",
  "E3": "#99FF00",
  "F3": "#66FF00",
  "G3": "#33FF00",
  "A3": "#00FF00", // Green
  "B3": "#00FF33",
  "C4": "#00FF66",
  "D4": "#00FF99",
  "E4": "#00FFCC",
  "F4": "#00FFFF", // Blue
  "G4": "#00CCFF",
  "A4": "#0099FF",
  "B4": "#0066FF",
  "C5": "#0033FF",
}

// Game settings
const GAME_SPEED = 5 // pixels per frame
const NOTE_WIDTH = 60
const NOTE_HEIGHT = 20
const LANE_HEIGHT = 30
const TARGET_LINE_X = 800 // Where notes should be played
const PERFECT_WINDOW = 50 // pixels from target line for perfect hit
const GOOD_WINDOW = 100 // pixels from target line for good hit
const OK_WINDOW = 150 // pixels from target line for ok hit

type GameNote = RiffNote & {
  x: number
  hit: boolean
  score: number
}

type GameState = {
  notes: GameNote[]
  score: number
  combo: number
  maxCombo: number
  perfect: number
  good: number
  ok: number
  missed: number
  isPlaying: boolean
  gameOver: boolean
}

export default function PlayRiff() {
  const riff = getRiff()
  const [gameState, setGameState] = useState<GameState>({
    notes: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    ok: 0,
    missed: 0,
    isPlaying: false,
    gameOver: false
  })
  const [bpm, setBpm] = useState(120)
  const [inputMode, setInputMode] = useState<"keyboard" | "guitar">("keyboard")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const router = useRouter()

  // Initialize the game
  useEffect(() => {
    if (!riff) return

    // Set the BPM from the riff
    setBpm(riff.bpm || 120)

    // Convert the notes to game notes with proper initial positioning
    const gameNotes: GameNote[] = riff.notes.map(note => ({
      ...note,
      x: 0, // Start at the left edge
      hit: false,
      score: 0
    }))

    // Sort notes by time to ensure proper ordering
    gameNotes.sort((a, b) => a.time - b.time)

    setGameState(prev => ({
      ...prev,
      notes: gameNotes,
      isPlaying: false,
      gameOver: false
    }))

    // Initialize canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Set canvas size
        canvas.width = 1000
        canvas.height = 600
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Draw initial state
        drawGame()
      }
    }
  }, [riff])

  // Start the game
  const startGame = () => {
    if (gameState.isPlaying) return

    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      gameOver: false,
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      good: 0,
      ok: 0,
      missed: 0
    }))

    // Start the game loop
    gameLoop()
  }

  // Stop the game
  const stopGame = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setGameState(prev => ({
      ...prev,
      isPlaying: false
    }))
  }

  // Game loop
  const gameLoop = () => {
    if (!gameState.isPlaying) return

    // Update note positions
    setGameState(prev => {
      const updatedNotes = prev.notes.map(note => {
        if (note.hit) return note
        return { ...note, x: note.x + GAME_SPEED }
      })

      // Check for missed notes
      const missedNotes = updatedNotes.filter(note => 
        !note.hit && note.x > TARGET_LINE_X + OK_WINDOW
      )

      if (missedNotes.length > 0) {
        // Update missed notes
        const newNotes = updatedNotes.map(note => {
          if (missedNotes.some(missed => missed.id === note.id)) {
            return { ...note, hit: true, score: 0 }
          }
          return note
        })

        // Update game state
        return {
          ...prev,
          notes: newNotes,
          combo: 0,
          missed: prev.missed + missedNotes.length
        }
      }

      // Check if all notes are hit or missed
      const allNotesProcessed = updatedNotes.every(note => note.hit)
      if (allNotesProcessed) {
        return {
          ...prev,
          notes: updatedNotes,
          isPlaying: false,
          gameOver: true
        }
      }

      return {
        ...prev,
        notes: updatedNotes
      }
    })

    // Draw the game
    drawGame()

    // Continue the game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }

  // Draw the game
  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the target line
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(TARGET_LINE_X, 0)
    ctx.lineTo(TARGET_LINE_X, canvas.height)
    ctx.stroke()

    // Draw the lanes
    availablePitches.forEach((pitch, index) => {
      const y = index * LANE_HEIGHT
      
      // Draw lane background
      ctx.fillStyle = "#333333"
      ctx.fillRect(0, y, canvas.width, LANE_HEIGHT)
      
      // Draw lane border
      ctx.strokeStyle = "#555555"
      ctx.lineWidth = 1
      ctx.strokeRect(0, y, canvas.width, LANE_HEIGHT)
      
      // Draw pitch label
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "12px Arial"
      ctx.fillText(pitch, 10, y + LANE_HEIGHT / 2 + 4)
    })

    // Draw the notes
    gameState.notes.forEach(note => {
      if (note.hit) return
      
      const pitchIndex = availablePitches.indexOf(note.pitch)
      if (pitchIndex === -1) return
      
      const y = pitchIndex * LANE_HEIGHT
      const color = noteColors[note.pitch] || "#FFFFFF"
      
      // Draw the note
      ctx.fillStyle = color
      ctx.fillRect(note.x, y, NOTE_WIDTH, NOTE_HEIGHT)
      
      // Draw note border
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 1
      ctx.strokeRect(note.x, y, NOTE_WIDTH, NOTE_HEIGHT)
    })

    // Draw the score
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "24px Arial"
    ctx.fillText(`Score: ${gameState.score}`, 20, 30)
    ctx.fillText(`Combo: ${gameState.combo}`, 20, 60)
    
    // Draw hit counts
    ctx.font = "16px Arial"
    ctx.fillText(`Perfect: ${gameState.perfect}`, 20, 90)
    ctx.fillText(`Good: ${gameState.good}`, 20, 110)
    ctx.fillText(`OK: ${gameState.ok}`, 20, 130)
    ctx.fillText(`Missed: ${gameState.missed}`, 20, 150)
  }

  // Handle keyboard input
  useEffect(() => {
    if (inputMode !== "keyboard" || !gameState.isPlaying) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Map keys to pitches (simplified for demo)
      const keyToPitch: Record<string, string> = {
        "a": "E2",
        "s": "A2",
        "d": "D3",
        "f": "G3",
        "g": "B3",
        "h": "E4"
      }

      const pitch = keyToPitch[e.key.toLowerCase()]
      if (!pitch) return

      // Find the closest note to hit
      const closestNote = gameState.notes
        .filter(note => !note.hit && note.pitch === pitch)
        .sort((a, b) => Math.abs(a.x - TARGET_LINE_X) - Math.abs(b.x - TARGET_LINE_X))[0]

      if (!closestNote) return

      // Calculate the distance from the target line
      const distance = Math.abs(closestNote.x - TARGET_LINE_X)

      // Determine the hit quality
      let score = 0
      let hitQuality = ""

      if (distance <= PERFECT_WINDOW) {
        score = 100
        hitQuality = "perfect"
      } else if (distance <= GOOD_WINDOW) {
        score = 50
        hitQuality = "good"
      } else if (distance <= OK_WINDOW) {
        score = 25
        hitQuality = "ok"
      } else {
        return // Too far to hit
      }

      // Update the game state
      setGameState(prev => {
        // Update the hit note
        const updatedNotes = prev.notes.map(note => {
          if (note.id === closestNote.id) {
            return { ...note, hit: true, score }
          }
          return note
        })

        // Update the score and combo
        const newCombo = prev.combo + 1
        const newScore = prev.score + score

        // Update hit counts
        const hitCounts = {
          perfect: hitQuality === "perfect" ? prev.perfect + 1 : prev.perfect,
          good: hitQuality === "good" ? prev.good + 1 : prev.good,
          ok: hitQuality === "ok" ? prev.ok + 1 : prev.ok,
          missed: prev.missed
        }

        return {
          ...prev,
          notes: updatedNotes,
          score: newScore,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          ...hitCounts
        }
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState, inputMode])

  if (!riff) {
    return (
      <div className="p-8 text-red-300">
        ⚠️ No riff loaded. Go record one first at <a href="/create" className="underline">/create</a>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-black">🎮 Play Your Riff</h1>
      <p className="text-black/80 mb-4">
        Session: <code className="bg-gray-200 px-2 py-1 rounded">{riff.recording}</code>
      </p>
      <p className="text-black/80 mb-4">
        BPM: {bpm} <span className="text-sm text-gray-500">(automatically detected)</span>
      </p>

      {/* Game Controls */}
      <div className="mb-6 flex items-center space-x-4">
        <button 
          onClick={gameState.isPlaying ? stopGame : startGame}
          className={`px-4 py-2 rounded ${gameState.isPlaying ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
        >
          {gameState.isPlaying ? 'Stop Game' : 'Start Game'}
        </button>
        
        <div className="flex items-center">
          <label className="mr-2 text-black">Input Mode:</label>
          <select 
            value={inputMode} 
            onChange={(e) => setInputMode(e.target.value as "keyboard" | "guitar")}
            className="border rounded px-2 py-1"
          >
            <option value="keyboard">Keyboard</option>
            <option value="guitar">Guitar (Coming Soon)</option>
          </select>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="mb-6 border border-gray-300 rounded overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={600} 
          className="bg-black w-full h-[600px]"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Game Instructions */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2 text-black">How to Play</h2>
        <p className="text-black/80 mb-2">
          Press the corresponding keys to hit the notes as they reach the target line:
        </p>
        <ul className="list-disc pl-5 text-black/80">
          <li><strong>A</strong> - E2 (Red)</li>
          <li><strong>S</strong> - A2 (Orange)</li>
          <li><strong>D</strong> - D3 (Yellow)</li>
          <li><strong>F</strong> - G3 (Light Green)</li>
          <li><strong>G</strong> - B3 (Green)</li>
          <li><strong>H</strong> - E4 (Blue)</li>
        </ul>
        <p className="text-black/80 mt-2">
          Hit notes as close to the target line as possible for higher scores!
        </p>
      </div>

      {/* Game Results */}
      {gameState.gameOver && (
        <div className="mb-6 p-4 bg-blue-100 rounded">
          <h2 className="text-lg font-semibold mb-2 text-black">Game Over!</h2>
          <p className="text-black/80">Final Score: {gameState.score}</p>
          <p className="text-black/80">Max Combo: {gameState.maxCombo}</p>
          <p className="text-black/80">Perfect: {gameState.perfect} | Good: {gameState.good} | OK: {gameState.ok} | Missed: {gameState.missed}</p>
        </div>
      )}

      <div className="mt-4 flex space-x-4">
        <button 
          onClick={() => router.push("/edit")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Edit Riff
        </button>
        
        <button 
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
} 