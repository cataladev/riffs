"use client"

import { useRef, useState, useEffect } from "react"
import { PitchDetector } from "pitchy"
import { saveRiff, RiffNote } from "../lib/riffStore"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import CoolButton from "./coolbutton"

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

// Define the available pitches in the piano roll
const availablePitches = [
  "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3",
  "A3", "G3", "F3", "E3", "D3", "C3", "B2", "A2", "G2", "F2", "E2"
]

// Function to find the closest available pitch
function findClosestPitch(detectedPitch: string): string {
  // Define note names for comparison
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  
  // If the detected pitch is already in the available pitches, use it
  if (availablePitches.includes(detectedPitch)) {
    return detectedPitch
  }
  
  // Otherwise, find the closest pitch
  const [note, octave] = detectedPitch.match(/([A-G]#?)(\d+)/)?.slice(1) || []
  if (!note || !octave) return "C4" // Default fallback
  
  // Find the closest pitch in the available pitches
  let closestPitch = availablePitches[0]
  let minDistance = Number.MAX_VALUE
  
  for (const pitch of availablePitches) {
    const [pNote, pOctave] = pitch.match(/([A-G]#?)(\d+)/)?.slice(1) || []
    if (!pNote || !pOctave) continue
    
    // Calculate distance based on note and octave
    const noteIndex = noteNames.indexOf(note)
    const pNoteIndex = noteNames.indexOf(pNote)
    const distance = Math.abs((parseInt(pOctave) - parseInt(octave)) * 12 + (pNoteIndex - noteIndex))
    
    if (distance < minDistance) {
      minDistance = distance
      closestPitch = pitch
    }
  }
  
  return closestPitch
}

function getSessionName(): string {
  const today = new Date()
  const formatted = today.toISOString().split("T")[0]
  return `session_${formatted}`
}

// Default BPM for new recordings
const DEFAULT_BPM = 120

// Function to calculate BPM from note timestamps
function calculateBPM(timestamps: string[]): number {
  if (timestamps.length < 2) return DEFAULT_BPM
  
  // Convert timestamps to numbers and sort them
  const times = timestamps.map(t => parseFloat(t)).sort((a, b) => a - b)
  
  // Calculate intervals between consecutive notes
  const intervals: number[] = []
  for (let i = 1; i < times.length; i++) {
    intervals.push(times[i] - times[i-1])
  }
  
  // Calculate the total duration of the recording
  const totalDuration = times[times.length - 1] - times[0]
  
  // If we have a very short recording, use a default BPM
  if (totalDuration < 1) return DEFAULT_BPM
  
  // Calculate the average interval
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  
  // Calculate BPM based on the average interval
  let bpm = Math.round(60 / avgInterval)
  
  // If the BPM is too high, it might be detecting subdivisions (e.g., eighth notes)
  // Try to find a more reasonable BPM by looking for patterns
  
  // Group intervals into bins to find the most common interval
  const binSize = 0.05 // 50ms bins
  const histogram: { [key: number]: number } = {}
  
  intervals.forEach(interval => {
    const bin = Math.round(interval / binSize)
    histogram[bin] = (histogram[bin] || 0) + 1
  })
  
  // Find the most common interval
  let maxCount = 0
  let mostCommonBin = 0
  
  Object.entries(histogram).forEach(([bin, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostCommonBin = parseInt(bin)
    }
  })
  
  // Calculate BPM from the most common interval
  const mostCommonInterval = mostCommonBin * binSize
  const commonBpm = Math.round(60 / mostCommonInterval)
  
  // If the common BPM is more reasonable than the average BPM, use it
  if (commonBpm >= 60 && commonBpm <= 200) {
    bpm = commonBpm
  }
  
  // If the BPM is still too high, try to find a lower BPM by looking for longer intervals
  if (bpm > 160) {
    // Look for intervals that are about twice the most common interval
    const targetInterval = mostCommonInterval * 2
    let closestInterval = 0
    let minDiff = Infinity
    
    Object.entries(histogram).forEach(([bin, count]) => {
      const interval = parseInt(bin) * binSize
      const diff = Math.abs(interval - targetInterval)
      if (diff < minDiff && count > maxCount * 0.3) { // Only consider intervals that appear reasonably often
        minDiff = diff
        closestInterval = interval
      }
    })
    
    if (closestInterval > 0) {
      const newBpm = Math.round(60 / closestInterval)
      if (newBpm >= 60 && newBpm <= 200) {
        bpm = newBpm
      }
    }
  }
  
  // If the BPM is too low, try to find a higher BPM by looking for shorter intervals
  if (bpm < 70) {
    // Look for intervals that are about half the most common interval
    const targetInterval = mostCommonInterval / 2
    let closestInterval = 0
    let minDiff = Infinity
    
    Object.entries(histogram).forEach(([bin, count]) => {
      const interval = parseInt(bin) * binSize
      const diff = Math.abs(interval - targetInterval)
      if (diff < minDiff && count > maxCount * 0.3) { // Only consider intervals that appear reasonably often
        minDiff = diff
        closestInterval = interval
      }
    })
    
    if (closestInterval > 0) {
      const newBpm = Math.round(60 / closestInterval)
      if (newBpm >= 60 && newBpm <= 200) {
        bpm = newBpm
      }
    }
  }
  
  // Ensure BPM is within reasonable range (60-200)
  return Math.max(60, Math.min(200, bpm))
}

export default function HumRecorder() {
  const [recording, setRecording] = useState(false)
  const [notes, setNotes] = useState<NotesMap>({})
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const router = useRouter()

  // Update recording duration
  useEffect(() => {
    if (recording && recordingTimer === null) {
      const timer = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
      setRecordingTimer(timer)
    } else if (!recording && recordingTimer !== null) {
      clearInterval(recordingTimer)
      setRecordingTimer(null)
    }

    return () => {
      if (recordingTimer !== null) {
        clearInterval(recordingTimer)
      }
    }
  }, [recording, recordingTimer])

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

      // Calculate audio level for visualization
      let sum = 0
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i]
      }
      const rms = Math.sqrt(sum / input.length)
      setAudioLevel(Math.min(1, rms * 10))

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
    setRecordingDuration(0)
  }

  const handleStop = () => {
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    setRecording(false)
    
    // Calculate BPM from the recorded notes
    const timestamps = Object.keys(notes)
    if (timestamps.length >= 2) {
      const calculatedBpm = calculateBPM(timestamps)
      setDetectedBpm(calculatedBpm)
      setBpm(calculatedBpm)
    }
  }

  const handleDone = () => {
    // Convert the notes to the format expected by EditRiff
    // Map the floating-point timestamps to integer time steps (0-63)
    const convertedNotes: RiffNote[] = Object.entries(notes).map(
      ([timestamp, noteName]) => {
        // Convert the floating-point timestamp to an integer time step (0-63)
        // We'll map the timestamps to the available time steps in EditRiff
        const floatTime = parseFloat(timestamp);
        // Map the time to a value between 0 and 63 (the length of timeSteps in EditRiff)
        const timeStep = Math.min(Math.floor(floatTime / 0.5), 63);
        
        // Find the closest available pitch
        const closestPitch = findClosestPitch(noteName);
        
        return {
          id: uuidv4(),
          pitch: closestPitch,
          time: timeStep,
        };
      }
    );
  
    console.log("Converted notes:", convertedNotes);
    console.log("Detected BPM:", bpm);
  
    saveRiff({
      id: uuidv4(),
      name: getSessionName(),
      recording: getSessionName(),
      notes: convertedNotes,
      bpm: bpm
    });
    alert("Recording saved! Redirecting to edit page...");
    router.push("/edit");
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="relative group overflow-hidden bg-gradient-to-r from-[#fe5b35] to-[#9722b6] rounded-xl p-[2px] w-full max-w-[50%]">
      <div className="relative z-10 bg-white rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gradient bg-gradient-to-r from-[#9722b6] via-[#fe5b35] to-[#eb3d5f] text-transparent bg-clip-text">
          Record Your Riff
        </h1>

        <div className="mb-8">
          {detectedBpm && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg border border-green-200">
              <p className="font-medium text-lg">Detected BPM: {detectedBpm}</p>
              <p className="text-sm">Based on the rhythm of your humming</p>
            </div>
          )}
        </div>
        <div className="mb-8">
          <div className="h-24 bg-gray-100 rounded-lg overflow-hidden relative">
            {recording && (
              <div
                className="absolute bottom-0 left-0 w-full bg-blue-500 transition-all duration-100"
                style={{
                  height: `${audioLevel * 100}%`,
                  opacity: 0.7,
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              {recording ? (
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mb-2"></div>
                  <p className="text-gray-700 font-medium">
                    Recording: {formatTime(recordingDuration)}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">
                  Press record to start humming your riff
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center mb-8">
          <CoolButton
            label={recording ? "Stop Recording" : "Start Recording"}
            onClick={recording ? handleStop : handleStart}
            className={recording ? "from-red-500 to-red-600" : ""}
          />
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Detected Notes:
          </h2>
          {Object.keys(notes).length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
              <ul className="space-y-2">
                {Object.entries(notes).map(([time, note], i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center p-2 bg-white rounded shadow-sm"
                  >
                    <span className="font-mono text-blue-600">{note}</span>
                    <span className="text-gray-500 text-sm">
                      {parseFloat(time).toFixed(2)}s
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
              No notes detected yet. Start recording and hum a melody.
            </div>
          )}
        </div>
        <div className="flex justify-center">
          {Object.keys(notes).length > 0 && !recording && (
            <button
              onClick={handleDone}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center"
            >
              <span>Continue to Edit</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <span className="absolute inset-0 bg-white/20 blur-sm translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
    </div>
  </div>
);

}