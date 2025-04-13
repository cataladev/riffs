"use client"

import { useRef, useState, useEffect } from "react"
import { PitchDetector } from "pitchy"
import { saveRiff, RiffNote } from "../lib/riffStore"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import CoolButton from "./coolbutton"
import CoolButton2 from "./coolbutton2"
import { AudioLines } from "lucide-react"
import { useTheme } from "next-themes";

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

// Function to quantize a timestamp to the nearest beat
function quantizeToBeat(timestamp: number, bpm: number, subdivision: number = 4): number {
  // Calculate the duration of a beat in seconds
  const beatDuration = 60 / bpm;
  
  // Calculate the duration of a subdivision (e.g., 1/4 note, 1/8 note)
  const subdivisionDuration = beatDuration / subdivision;
  
  // Find the nearest subdivision
  const nearestSubdivision = Math.round(timestamp / subdivisionDuration);
  
  // Convert back to seconds
  return nearestSubdivision * subdivisionDuration;
}

// Function to convert a quantized timestamp to a time step (0-63)
function timestampToTimeStep(timestamp: number, bpm: number): number {
  // Calculate the duration of a beat in seconds
  const beatDuration = 60 / bpm;
  
  // Calculate how many steps per beat based on BPM
  const stepsPerBeat = bpm > 160 ? 1 : bpm > 120 ? 2 : 4;
  
  // Calculate the time step
  const timeStep = Math.round(timestamp / (beatDuration / stepsPerBeat));
  
  // Ensure the time step is within the valid range (0-63)
  return Math.min(Math.max(0, timeStep), 63);
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
  const [quantizedNotes, setQuantizedNotes] = useState<NotesMap>({})
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [lastDetectedNote, setLastDetectedNote] = useState<string | null>(null)
  const [lastNoteTime, setLastNoteTime] = useState<number>(0)
  const [noteHoldTime, setNoteHoldTime] = useState<number>(0)
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null)
  const [recentNotes, setRecentNotes] = useState<string[]>([])
  const [noteTransitionTime, setNoteTransitionTime] = useState<number>(0)
  const [filteredNote, setFilteredNote] = useState<string | null>(null)
  const [filteredNoteTime, setFilteredNoteTime] = useState<number>(0)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
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

  // Effect to quantize notes when BPM changes
  useEffect(() => {
    if (Object.keys(notes).length > 0 && bpm) {
      const quantized: NotesMap = {};
      
      Object.entries(notes).forEach(([timestamp, note]) => {
        const floatTime = parseFloat(timestamp);
        const quantizedTime = quantizeToBeat(floatTime, bpm);
        const quantizedKey = quantizedTime.toFixed(2);
        
        // If there's already a note at this quantized time, keep the one with the closest original time
        if (quantized[quantizedKey]) {
          const existingTime = parseFloat(Object.keys(notes).find(t => notes[t] === quantized[quantizedKey]) || "0");
          if (Math.abs(floatTime - quantizedTime) < Math.abs(existingTime - quantizedTime)) {
            quantized[quantizedKey] = note;
          }
        } else {
          quantized[quantizedKey] = note;
        }
      });
      
      setQuantizedNotes(quantized);
    }
  }, [notes, bpm]);

  const handleStart = async () => {
    // Use a more specific approach to handle browser compatibility
    let AudioContextClass: typeof AudioContext;
    
    if (window.AudioContext) {
      AudioContextClass = window.AudioContext;
    } else if ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) {
      AudioContextClass = (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    } else {
      throw new Error('AudioContext not supported in this browser');
    }
    
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audioContext.createMediaStreamSource(stream)

    const processor = audioContext.createScriptProcessor(2048, 1, 1)
    const sampleRate = audioContext.sampleRate
    const detector = PitchDetector.forFloat32Array(2048)

    startTimeRef.current = performance.now()
    setLastNoteTime(0)
    setNoteHoldTime(0)
    setRecentNotes([])
    setNoteTransitionTime(0)
    setFilteredNote(null)
    setFilteredNoteTime(0)

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
        const currentTime = performance.now()
        const elapsedTime = (currentTime - startTimeRef.current) / 1000
        
        // Update recent notes list (keep last 5 notes)
        setRecentNotes(prev => {
          const updated = [...prev, note];
          return updated.slice(-5);
        });
        
        // Check if this is a new note or a held note
        if (note !== lastDetectedNote) {
          // New note detected
          setLastDetectedNote(note)
          setLastNoteTime(elapsedTime)
          setNoteHoldTime(0)
          setNoteTransitionTime(elapsedTime)
          
          // Check if this is a significant note change (not an intermediate note)
          const isSignificantChange = isSignificantNoteChange(note, recentNotes);
          
          if (isSignificantChange) {
            // Record the new note
            const timestamp = elapsedTime.toFixed(2)
            setNotes((prev) => {
              if (prev[timestamp]) return prev
              return { ...prev, [timestamp]: note }
            })
            setFilteredNote(null)
          } else {
            // This is an intermediate note being filtered out
            setFilteredNote(note)
            setFilteredNoteTime(elapsedTime)
            
            // Clear the filtered note after 1 second
            setTimeout(() => {
              setFilteredNote(null)
            }, 1000)
          }
        } else {
          // Same note is being held
          const holdTime = elapsedTime - lastNoteTime
          setNoteHoldTime(holdTime)
          
          // Only record a new instance of the same note if it's been held for a significant time
          // This prevents rapid-fire duplicate notes but allows for sustained notes
          if (holdTime > 0.5) { // 500ms threshold
            const timestamp = elapsedTime.toFixed(2)
            setNotes((prev) => {
              if (prev[timestamp]) return prev
              return { ...prev, [timestamp]: note }
            })
            setLastNoteTime(elapsedTime)
            setNoteHoldTime(0)
          }
        }
      }
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
    processorRef.current = processor
    setRecording(true)
    setRecordingDuration(0)
    
    // Update recording duration every second
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1)
    }, 1000)
  }

  // Helper function to determine if a note change is significant
  const isSignificantNoteChange = (currentNote: string, recentNotes: string[]): boolean => {
    if (recentNotes.length < 2) return true;
    
    // Get the note name and octave
    const [currentNoteName, currentOctave] = currentNote.match(/([A-G]#?)(\d+)/)?.slice(1) || [];
    if (!currentNoteName || !currentOctave) return true;
    
    // Get the last recorded note
    const lastRecordedNote = recentNotes[recentNotes.length - 2];
    const [lastNoteName, lastOctave] = lastRecordedNote.match(/([A-G]#?)(\d+)/)?.slice(1) || [];
    if (!lastNoteName || !lastOctave) return true;
    
    // Define note names for comparison
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    // Calculate the distance between notes
    const currentNoteIndex = noteNames.indexOf(currentNoteName);
    const lastNoteIndex = noteNames.indexOf(lastNoteName);
    const octaveDiff = parseInt(currentOctave) - parseInt(lastOctave);
    
    // Calculate semitone difference
    const semitoneDiff = Math.abs(octaveDiff * 12 + (currentNoteIndex - lastNoteIndex));
    
    // If the difference is more than 2 semitones, consider it a significant change
    // This helps filter out intermediate notes during pitch transitions
    return semitoneDiff > 2;
  };

  const handleStop = () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    setRecording(false)
    setLastDetectedNote(null)
    setRecentNotes([])
    
    // Calculate BPM from the recorded notes
    const timestamps = Object.keys(notes)
    if (timestamps.length >= 2) {
      const calculatedBpm = calculateBPM(timestamps)
      setDetectedBpm(calculatedBpm)
      setBpm(calculatedBpm)
    }
  }

  const handleDone = () => {
    // Use the quantized notes for the final output
    const notesToUse = Object.keys(quantizedNotes).length > 0 ? quantizedNotes : notes;
    
    // Convert the notes to the format expected by EditRiff
    // Map the floating-point timestamps to integer time steps (0-63)
    const convertedNotes: RiffNote[] = Object.entries(notesToUse).map(
      ([timestamp, noteName]) => {
        // Convert the floating-point timestamp to an integer time step (0-63)
        const floatTime = parseFloat(timestamp);
        // Convert to time step using the BPM
        const timeStep = timestampToTimeStep(floatTime, bpm);
        
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
    router.push("/edit");
  }

  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative group backdrop-blur-md shadow-2xl rounded-xl p-[2px] w-full max-w-[50%] gradient-border animate-fadeIn">
        <div className="relative z-10 rounded-xl p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-6 text-center text-gradient bg-gradient-to-r from-[#9722b6] via-[#fe5b35] to-[#eb3d5f] text-transparent bg-clip-text">
            Record Your Riff
          </h1>

          {detectedBpm && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg border border-green-200">
              <p className="font-medium text-lg">Detected BPM: {detectedBpm}</p>
              <p className="text-sm">Based on the rhythm of your humming</p>
            </div>
          )}
          
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
                  <p className="text-gray-500">Press record to start humming your riff</p>
                )}
              </div>
            </div>
          </div>
          
          {lastDetectedNote && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700 font-medium">Current Note: </span>
                  <span className="text-blue-600 font-bold text-xl">{lastDetectedNote}</span>
                </div>
                {noteHoldTime > 0 && (
                  <div className="text-sm text-gray-600">
                    Holding for: {noteHoldTime.toFixed(1)}s
                  </div>
                )}
              </div>
              {noteHoldTime > 0 && (
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, (noteHoldTime / 0.5) * 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
          
          {filteredNote && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700 font-medium">Filtered Note: </span>
                  <span className="text-yellow-600 font-bold text-xl">{filteredNote}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Intermediate note (not recorded)
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-center mb-8">
              <CoolButton
                label={recording ? "Stop Recording" : "Start Recording"}
                onClick={recording ? handleStop : handleStart}
                className={`${recording ? "from-red-500 to-red-600" : ""} animate-fadeIn opacity-0`}
                style={{ animationDelay: "1.0s", animationFillMode: "forwards" }}
                iconRight={<AudioLines size={16} />}
              />
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Detected Notes:</h2>
              {Object.keys(notes).length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <ul className="space-y-2">
                    {Object.entries(notes).map(([time, note], i) => (
                      <li key={i} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                        <span className="font-mono text-blue-600">{note}</span>
                        <span className="text-gray-500 text-sm">{parseFloat(time).toFixed(2)}s</span>
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
                <CoolButton2
                  onClick={handleDone}
                  label="Continue to Edit"
                  className="animate-fadeIn opacity-0"
                  style={{ animationDelay: "1.5s", animationFillMode: "forwards" }}
                  iconRight={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
  )
}