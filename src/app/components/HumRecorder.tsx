"use client"

import { useRef, useState } from "react"
import { PitchDetector } from "pitchy"
import { saveRiff, RiffNote } from "../lib/riffStore"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

const NOTE_TO_STRING_FRET: Record<string, { string: string; fret: number }> = {
  E2: { string: "E", fret: 0 },
  F2: { string: "E", fret: 1 },
  G2: { string: "E", fret: 3 },
  A2: { string: "E", fret: 5 },
  B2: { string: "A", fret: 2 },
  C3: { string: "A", fret: 3 },
  D3: { string: "A", fret: 5 },
  E3: { string: "D", fret: 2 },
  F3: { string: "D", fret: 3 },
  G3: { string: "D", fret: 5 },
  A3: { string: "G", fret: 2 },
  B3: { string: "B", fret: 0 },
  C4: { string: "B", fret: 1 },
  D4: { string: "B", fret: 3 },
  E4: { string: "e", fret: 0 },
  F4: { string: "e", fret: 1 },
  G4: { string: "e", fret: 3 },
  A4: { string: "e", fret: 5 },
  B4: { string: "e", fret: 7 },
  C5: { string: "e", fret: 8 },
}

type NotesMap = { [timestamp: string]: string }

function getNoteFromFrequency(freq: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  const noteNum = 12 * (Math.log(freq / 440) / Math.log(2))
  const rounded = Math.round(noteNum) + 69
  const octave = Math.floor(rounded / 12 - 1)
  const note = noteNames[rounded % 12]
  return `${note}${octave}`
}

function getSessionName(): string {
  const today = new Date()
  const formatted = today.toISOString().split("T")[0]
  return `session_${formatted}`
}

export default function HumRecorder() {
  const [recording, setRecording] = useState(false)
  const [notes, setNotes] = useState<NotesMap>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const router = useRouter()

  const handleStart = async () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContext()
    audioContextRef.current = audioContext

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audioContext.createMediaStreamSource(stream)

    const processor = audioContext.createScriptProcessor(2048, 1, 1)
    const sampleRate = audioContext.sampleRate
    const detector = PitchDetector.forFloat32Array(2048)

    startTimeRef.current = performance.now()

    processor.onaudioprocess = (e) => {
      const input = new Float32Array(detector.inputLength)
      e.inputBuffer.copyFromChannel(input, 0)
      const [pitch, clarity] = detector.findPitch(input, sampleRate)

      if (clarity > 0.95 && pitch) {
        const note = getNoteFromFrequency(pitch)
        const timestamp = ((performance.now() - startTimeRef.current) / 1000).toFixed(2)

        setNotes((prev) => {
          if (prev[timestamp]) return prev
          return { ...prev, [timestamp]: note }
        })
      }
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
    processorRef.current = processor
    setRecording(true)
  }

  const handleStop = () => {
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    setRecording(false)
  }

  const handleDone = () => {
    const convertedNotes: RiffNote[] = Object.entries(notes).map(
      ([timestamp, noteName]) => ({
        id: uuidv4(),
        pitch: noteName, // Use the detected note (e.g. "E4") directly.
        time: parseFloat(timestamp), // The timestamp becomes the time coordinate.
      })
    );
  
    console.log("Converted notes:", convertedNotes);
  
    saveRiff({
      recording: getSessionName(),
      notes: convertedNotes,
    });
    alert("Done clicked!");
    router.push("/edit");
  }
  

  return (
    <div>
      <button
        onClick={recording ? handleStop : handleStart}
        className="px-6 py-3 bg-white text-black rounded-xl hover:scale-105 transition"
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Detected Notes:</h2>
        <ul className="text-sm space-y-1">
          {Object.entries(notes).map(([time, note], i) => (
            <li key={i}>
              {note} @ {time}s
            </li>
          ))}
        </ul>

        {Object.keys(notes).length > 0 && !recording && (
          <button
            onClick={handleDone}
            className="mt-6 px-6 py-3 bg-green-500 text-white rounded-xl hover:scale-105 transition"
          >
            Done → Edit Riff
          </button>
        )}
      </div>
    </div>
  )
}