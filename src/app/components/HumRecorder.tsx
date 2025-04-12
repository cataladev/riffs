"use client"

import { useRef, useState } from "react"
import { AMDF } from "pitchfinder"

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

  const handleStart = async () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContext()
    audioContextRef.current = audioContext

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audioContext.createMediaStreamSource(stream)

    const processor = audioContext.createScriptProcessor(2048, 1, 1)
    const detectPitch = AMDF()
    startTimeRef.current = performance.now()

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const pitch = detectPitch(input)

      if (pitch) {
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

    const output = {
      recording: getSessionName(),
      notes: notes,
    }

    console.log("Riff Data:", output)
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
      </div>
    </div>
  )
}
