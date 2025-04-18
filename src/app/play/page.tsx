"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react';
import * as Tone from 'tone';
import { useSearchParams } from 'next/navigation';
import * as Pitchy from "pitchy";
import WebCam from "../components/Camera/WebCamera";
import CoolButton from "../components/coolbutton";
import { CirclePause, CirclePlay, Camera } from "lucide-react";

// Regular expression to extract octave from a note string
const EXTRACT_OCTAVE = /\d+$/;
const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const FRET_COUNT = 24;

// Available pitches for fallback and closest match
const availablePitches = [
  "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3",
  "A3", "G3", "F3", "E3", "D3", "C3", "B2", "A2", "G2", "F2", "E2"
];

// Get the note at a specific fret on a given string note
const getNoteAtPosition = (stringNote: string, fret: number) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const baseNote = stringNote.replace(EXTRACT_OCTAVE, '');
  const octave = parseInt(stringNote.match(EXTRACT_OCTAVE)?.[0] || '4');
  const baseIndex = notes.findIndex(n => n === baseNote);
  if (baseIndex === -1) return null;
  const newIndex = (baseIndex + fret) % 12;
  const octaveChange = Math.floor((baseIndex + fret) / 12);
  const newOctave = octave + octaveChange;
  return `${notes[newIndex]}${newOctave}`;
};

type NotePosition = {
  stringIndex: number,
  fret: number
}

// Find all positions for a given note on the fretboard
const getAllPositionsForNote = (note: string): NotePosition[] => {
  const positions: NotePosition[] = [];
  const baseNote = note.replace(EXTRACT_OCTAVE, '');
  const octave = parseInt(note.match(EXTRACT_OCTAVE)?.[0] || '4');

  STANDARD_TUNING.forEach((stringNote, stringIndex) => {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const noteAtPosition = getNoteAtPosition(stringNote, fret);
      if (!noteAtPosition) continue;
      const posBaseNote = noteAtPosition.replace(EXTRACT_OCTAVE, '');
      const posOctave = parseInt(noteAtPosition.match(EXTRACT_OCTAVE)?.[0] || '4');
      if (posBaseNote === baseNote && posOctave === octave) {
        positions.push({ stringIndex, fret });
      }
    }
  });

  // Fallback: if no positions found, try matching by base note only
  if (positions.length === 0) {
    console.log(`No exact matches for ${note}, looking for fallbacks`);
    STANDARD_TUNING.forEach((stringNote, stringIndex) => {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const noteAtPosition = getNoteAtPosition(stringNote, fret);
        if (!noteAtPosition) continue;
        const posBaseNote = noteAtPosition.replace(EXTRACT_OCTAVE, '');
        if (posBaseNote === baseNote) {
          console.log(`Fallback: string ${stringIndex}, fret ${fret} -> ${noteAtPosition}`);
          positions.push({ stringIndex, fret });
        }
      }
    });
  }
  return positions;
};

// Generate a color based on the note's base name for consistent styling
const getNoteColor = (note: string) => {
  const baseNote = note.replace(EXTRACT_OCTAVE, '');
  const colorMap: Record<string, string> = {
    'C': 'bg-[#9722b6]',
    'C#': 'bg-[#9722b6]',
    'D': 'bg-[#fe5b35]',
    'D#': 'bg-[#fe5b35]',
    'E': 'bg-[#eb3d5f]',
    'F': 'bg-[#9722b6]',
    'F#': 'bg-[#9722b6]',
    'G': 'bg-[#fe5b35]',
    'G#': 'bg-[#fe5b35]',
    'A': 'bg-[#eb3d5f]',
    'A#': 'bg-[#eb3d5f]',
    'B': 'bg-[#9722b6]'
  };
  return colorMap[baseNote] || 'bg-gray-800';
};

// Convert a frequency to a note string using logarithms
const frequencyToNote = (frequency: number): string => {
  const noteNum = 12 * (Math.log2(frequency / 440) + 4);
  const note = Math.round(noteNum);
  const octave = Math.floor(note / 12) - 1;
  const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][note % 12];
  return `${noteName}${octave}`;
};

// Compare two notes by their base note (ignoring the octave)
const notesMatch = (note1: string, note2: string): boolean => {
  const baseNote1 = note1.replace(/\d+$/, '').toUpperCase();
  const baseNote2 = note2.replace(/\d+$/, '').toUpperCase();
  console.log(`Comparing: ${note1} (${baseNote1}) vs ${note2} (${baseNote2})`);
  const match = baseNote1 === baseNote2;
  console.log(`Result: ${match}`);
  return match;
};

// Find the closest available pitch for a detected note
const findClosestPitch = (detectedPitch: string): string => {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  if (availablePitches.includes(detectedPitch)) return detectedPitch;
  const match = detectedPitch.match(/([A-G]#?)(\d+)/);
  if (!match) return "C4";
  const [, note, octave] = match;
  let closestPitch = availablePitches[0];
  let minDistance = Number.MAX_VALUE;
  for (const pitch of availablePitches) {
    const result = pitch.match(/([A-G]#?)(\d+)/);
    if (!result) continue;
    const [, pNote, pOctave] = result;
    const noteIndex = noteNames.indexOf(note);
    const pNoteIndex = noteNames.indexOf(pNote);
    const distance = Math.abs((parseInt(pOctave) - parseInt(octave)) * 12 + (pNoteIndex - noteIndex));
    if (distance < minDistance) {
      minDistance = distance;
      closestPitch = pitch;
    }
  }
  return closestPitch;
};

const KEYBOARD_MAPPING: Record<string, string> = {
  'a': 'E2',
  's': 'A2',
  'd': 'D3',
  'f': 'G3',
  'g': 'B3',
  'h': 'E4'
};

// Add type definition for audio processing event
interface AudioProcessingEventData {
  inputBuffer: AudioBuffer;
  outputBuffer: AudioBuffer;
  playbackTime: number;
}

// Create a client component that uses useSearchParams
function GuitarFretboardVisualizerContent() {
  const searchParams = useSearchParams();
  const notesParam = searchParams.get('notes');
  const bpmParam = searchParams.get('bpm');
  
  const initialNotes = notesParam ? JSON.parse(decodeURIComponent(notesParam)) : ['E4', 'G4', 'B4', 'E5', 'D5', 'B4'];
  // Ensure BPM is within bounds (20-160)
  const initialTempo = bpmParam ? Math.min(160, Math.max(20, parseInt(decodeURIComponent(bpmParam)))) : 120;
  
  const [notes, setNotes] = useState(initialNotes);
  const [tempo, setTempo] = useState(initialTempo);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'visualize' | 'keyboard' | 'guitar'>('visualize');
  const [score, setScore] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [nextNoteIndex, setNextNoteIndex] = useState(-1);
  const [lastKeyPressTime, setLastKeyPressTime] = useState(0);
  const [scoredNotes, setScoredNotes] = useState<Set<number>>(new Set());
  
  const synthRef = useRef<Tone.Synth<Tone.SynthOptions> | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const [fretboardWidth, setFretboardWidth] = useState(0);
  const fretboardRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentDetectedNote, setCurrentDetectedNote] = useState<string | null>(null);
  const [detectionClarity, setDetectionClarity] = useState<number>(0);
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const detectorRef = useRef<Pitchy.PitchDetector<Float32Array> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextClosedRef = useRef<boolean>(false);
  const [waitingForNewNote, setWaitingForNewNote] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(initialTempo);

  // Add camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Create refs for state variables used in the audio process callback
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const currentNoteIndexRef = useRef(currentNoteIndex);
  useEffect(() => { currentNoteIndexRef.current = currentNoteIndex; }, [currentNoteIndex]);

  const waitingForNewNoteRef = useRef(waitingForNewNote);
  useEffect(() => { waitingForNewNoteRef.current = waitingForNewNote; }, [waitingForNewNote]);

  const scoredNotesRef = useRef(scoredNotes);
  useEffect(() => { scoredNotesRef.current = scoredNotes; }, [scoredNotes]);

  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  const totalNotesRef = useRef(totalNotes);
  useEffect(() => { totalNotesRef.current = totalNotes; }, [totalNotes]);

  useEffect(() => {
    if (notesParam) {
      const parsedNotes = JSON.parse(decodeURIComponent(notesParam));
      setNotes(parsedNotes);
    }
  }, [notesParam]);

  useEffect(() => {
    synthRef.current = new Tone.Synth().toDestination();
    return () => {
      if (sequenceRef.current) sequenceRef.current.dispose();
      if (synthRef.current) synthRef.current.dispose();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (fretboardRef.current) {
        setFretboardWidth(fretboardRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Handle keyboard input (Keyboard mode)
  useEffect(() => {
    if (mode !== 'keyboard' || !isPlaying) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const now = Date.now();
      if (now - lastKeyPressTime < 100) return;
      if (KEYBOARD_MAPPING[key] && currentNoteIndex >= 0) {
        setLastKeyPressTime(now);
        const playedNote = KEYBOARD_MAPPING[key];
        const targetNote = notes[currentNoteIndex];
        if (notesMatch(playedNote, targetNote)) {
          setScore(prev => Math.min(prev + 1, totalNotes));
          setScoredNotes(prev => {
            const newSet = new Set(prev);
            newSet.add(currentNoteIndex);
            return newSet;
          });
          setFeedback('Correct! +1 point');
          setTimeout(() => setFeedback(''), 1000);
        } else {
          if (!scoredNotes.has(currentNoteIndex)) {
            setScore(prev => Math.max(prev - 1, 0));
            setFeedback('Wrong key! -1 point');
          } else {
            setFeedback('Wrong key! (already scored)');
          }
          setTimeout(() => setFeedback(''), 1000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isPlaying, currentNoteIndex, notes, lastKeyPressTime, totalNotes, scoredNotes]);

  // Play note sequence using Tone.js
  const playSequence = () => {
    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      setNextNoteIndex(-1);
      setIsListening(false);
      setShowResults(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      return;
    }
    setIsPlaying(true);
    setScore(0);
    setTotalNotes(notes.length);
    setScoredNotes(new Set());
    setShowResults(false);
    Tone.Transport.bpm.value = bpm;
    setTempo(bpm);

    const noteEvents = notes.map((_: string, i: number) => i);
    if (sequenceRef.current) sequenceRef.current.dispose();

    const showNextNotePreview = (index: number) => {
      if (index < notes.length - 1) {
        setNextNoteIndex(index + 1);
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = setTimeout(() => setNextNoteIndex(-1), 500);
      }
    };

    sequenceRef.current = new Tone.Sequence(
      (time, index) => {
        setCurrentNoteIndex(index);
        synthRef.current?.triggerAttackRelease(notes[index], '8n', time);
        showNextNotePreview(index);
        setWaitingForNewNote(false);
      },
      noteEvents,
      '4n'
    ).start(0);

    Tone.Transport.start();
    Tone.Transport.scheduleOnce(() => {
      Tone.Transport.stop();
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      setNextNoteIndex(-1);
      sequenceRef.current?.dispose();
      setIsListening(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      if (mode !== 'visualize') setShowResults(true);
    }, `+${notes.length * (60 / tempo)}`);
  };

  // Set up pitch detection for Guitar mode
  const startPitchDetection = async () => {
    try {
      audioContextClosedRef.current = false;
      let AudioContextClass: typeof AudioContext;
      if (window.AudioContext) {
        AudioContextClass = window.AudioContext;
      } else if ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) {
        AudioContextClass = (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      } else {
        throw new Error('AudioContext not supported');
      }
      if (!audioContextRef.current || audioContextClosedRef.current) {
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      streamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const bufferSize = 2048;
      const processor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      const sampleRate = audioContextRef.current.sampleRate;
      const detector = Pitchy.PitchDetector.forFloat32Array(bufferSize);
      detectorRef.current = detector;
      
      processor.onaudioprocess = (e: AudioProcessingEventData) => {
        if (!detectorRef.current) return;
        const input = new Float32Array(detectorRef.current.inputLength);
        e.inputBuffer.copyFromChannel(input, 0);
        const [pitch, clarity] = detectorRef.current.findPitch(input, sampleRate);
        
        // Use a slightly lower clarity threshold (0.7) for better detection
        if (clarity > 0.7 && pitch > 0) {
          const note = frequencyToNote(pitch);
          const detectedPitch = findClosestPitch(note);
          setCurrentDetectedNote(detectedPitch);
          setDetectionClarity(clarity);
          setLastDetectionTime(Date.now());
          
          // Use refs to ensure the latest state values are read here
          if (modeRef.current === 'guitar' && isPlayingRef.current && currentNoteIndexRef.current >= 0) {
            const expectedNote = notesRef.current[currentNoteIndexRef.current];
            const isNoteMatch = notesMatch(detectedPitch, expectedNote);
            console.log(`Detected: ${detectedPitch}, Expected: ${expectedNote}, Match: ${isNoteMatch}`);
            const now = Date.now();
            if (isNoteMatch && !waitingForNewNoteRef.current) {
              if (!scoredNotesRef.current.has(currentNoteIndexRef.current)) {
                setScore(prev => Math.min(prev + 1, totalNotesRef.current));
                setFeedback(`Correct! ${detectedPitch} matches ${expectedNote}`);
                setScoredNotes(prev => {
                  const newSet = new Set(prev);
                  newSet.add(currentNoteIndexRef.current);
                  return newSet;
                });
              } else {
                setFeedback('Correct note, but already scored!');
              }
              setCurrentDetectedNote(detectedPitch);
              setLastDetectionTime(now);
              waitingForNewNoteRef.current = true;
              setWaitingForNewNote(true);
              setTimeout(() => {
                waitingForNewNoteRef.current = false;
                setWaitingForNewNote(false);
              }, 500);
            } else if (!isNoteMatch && !waitingForNewNoteRef.current) {
              if (!scoredNotesRef.current.has(currentNoteIndexRef.current)) {
                setScore(prev => Math.max(prev - 1, 0));
                setFeedback(`Wrong note! -1 point (detected: ${detectedPitch}, expected: ${expectedNote})`);
              } else {
                setFeedback(`Wrong note! (already scored)`);
              }
            }
          }
        } else {
          setCurrentDetectedNote(null);
          setDetectionClarity(0);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;
      setIsListening(true);
    } catch (error) {
      console.error("Error starting pitch detection:", error);
      setFeedback("Error starting microphone. Please check permissions.");
    }
  };

  const stopPitchDetection = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && !audioContextClosedRef.current) {
      try {
        audioContextRef.current.close();
        audioContextClosedRef.current = true;
      } catch (error) {
        console.error("Error closing AudioContext:", error);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsListening(false);
    setCurrentDetectedNote(null);
    setDetectionClarity(0);
  };

  useEffect(() => {
    return () => {
      stopPitchDetection();
    };
  }, []);

  const handleModeChange = (newMode: 'visualize' | 'keyboard' | 'guitar') => {
    setMode(newMode);
    if (newMode === 'guitar') {
      startPitchDetection();
    } else {
      stopPitchDetection();
    }
  };

  const currentPositions = currentNoteIndex >= 0 ? getAllPositionsForNote(notes[currentNoteIndex]) : [];
  const nextNotePositions = nextNoteIndex >= 0 ? getAllPositionsForNote(notes[nextNoteIndex]) : [];
  const currentNoteColor = currentNoteIndex >= 0 ? getNoteColor(notes[currentNoteIndex]) : '';
  const nextNoteColor = nextNoteIndex >= 0 ? getNoteColor(notes[nextNoteIndex]) : '';
  const currentNoteDisplayName = currentNoteIndex >= 0 ? notes[currentNoteIndex].replace(EXTRACT_OCTAVE, '') : '';
  const nextNoteDisplayName = nextNoteIndex >= 0 ? notes[nextNoteIndex].replace(EXTRACT_OCTAVE, '') : '';
  const labelWidth = 40;
  const availableWidth = fretboardWidth ? fretboardWidth - labelWidth : 0;
  const fretSpacing = availableWidth / (FRET_COUNT + 1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-4xl rounded-xl shadow-lg p-6 gradient-border">
        <h1 className="text-3xl font-bold mb-6 text-center text-gradient bg-gradient-to-r from-[#9722b6] via-[#fe5b35] to-[#eb3d5f] text-transparent bg-clip-text">
          🎸 Play Your Riff
        </h1>
        
        {/* BPM Controls */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-[#fe5b35] font-bold min-w-[80px]">BPM: {bpm}</span>
          <input
            type="range"
            min="20"
            max="160"
            value={bpm}
            onChange={(e) => {
              // Ensure BPM is within bounds (20-160)
              const newBpm = Math.min(160, Math.max(20, parseInt(e.target.value)));
              setBpm(newBpm);
              setTempo(newBpm);
              if (isPlaying) {
                Tone.Transport.bpm.value = newBpm;
              }
            }}
            className="w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#9722b6]"
          />
          <span className="text-sm text-gray-500">20-160 BPM</span>
        </div>
        
        {/* Mode Selection */}
        <div className="mb-6 flex justify-center space-x-4">
          <CoolButton
            label={"Visualize"}
            onClick={() => handleModeChange('visualize')}
            className={`px-4 py-2 rounded-lg ${mode === 'visualize' ? ' text-white' : 'bg-pink-100 text-purple-800 hover:bg-pink-200'}`}
          >

          </CoolButton>
          <CoolButton
            label ={"Keyboard Mode"}
            onClick={() => handleModeChange('keyboard')}
            className={`px-4 py-2 rounded-lg ${mode === 'keyboard' ? ' text-white' : 'bg-pink-100 text-purple-800 hover:bg-pink-200'}`}
          >
          </CoolButton>
          <CoolButton
            label = {"Guitar Mode"}
            onClick={() => handleModeChange('guitar')}
            className={`px-4 py-2 rounded-lg ${mode === 'guitar' ? ' text-white' : 'bg-pink-100 text-purple-800 hover:bg-pink-200'}`}
          >
          </CoolButton>
        </div>
        
        {/* Mode Instructions */}
        <div className="mb-6 p-4 bg-pink-100 rounded-lg border border-pink-300">
          <h3 className="font-semibold text-purple-800 mb-2">
            {mode === 'visualize' 
              ? 'Visualization Mode' 
              : mode === 'keyboard' 
                ? 'Keyboard Mode Instructions' 
                : 'Guitar Mode Instructions'}
          </h3>
          <p className="text-purple-700">
            {mode === 'visualize' 
              ? 'Watch and listen to the notes being played.' 
              : mode === 'keyboard' 
                ? 'Use your keyboard to play the notes as they appear. Press the corresponding key when a note is highlighted.' 
                : 'Play the notes on your guitar as they appear. The app will listen and detect the notes you play.'}
          </p>
        </div>
        
        {/* Keyboard Bindings */}
        {mode === 'keyboard' && (
          <div className="mb-6 p-4 bg-rose-100 rounded-lg border border-rose-300">
            <h3 className="font-semibold text-[#ef5151] mb-2">Keyboard Bindings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(KEYBOARD_MAPPING).map(([key, note]) => (
                <div key={key} className="flex items-center">
                  <div className="w-8 h-8 bg-rose-50 rounded flex items-center justify-center mr-2 font-bold text-[#ef5151]">
                    {key.toUpperCase()}
                  </div>
                  <div className={`w-8 h-8 ${getNoteColor(note)} rounded-full flex items-center justify-center text-white font-bold`}>
                    {note.replace(EXTRACT_OCTAVE, '')}
                  </div>
                  <span className="ml-2 text-sm text-[#ef5151]">{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Guitar Mode Display */}
        {mode === 'guitar' && (
          <div className="mb-6 p-4 bg-rose-100 rounded-lg border border-rose-300">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[#ef5151] font-medium">Detected Note: </span>
                  <span className="text-[#ef5151] font-bold text-xl">
                    {currentDetectedNote || 'No note detected'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-[#ef5151] font-bold mr-2">Clarity:</span>
                  <div className="w-24 h-2 bg-gray-400 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${detectionClarity * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-gray-600">{Math.round(detectionClarity * 100)}%</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-[#ef5151]">
                  {isListening ? 'Microphone active - Listening for notes...' : 'Microphone inactive'}
                </span>
              </div>
              {lastDetectionTime > 0 && (
                <div className="text-xs text-[#ef5151]">
                  Last detection: {new Date(lastDetectionTime).toLocaleTimeString()}
                </div>
              )}
              {isPlaying && currentNoteIndex >= 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-gray-700 font-medium">Expected Note: </span>
                  <span className="text-blue-600 font-bold text-xl">
                    {notes[currentNoteIndex]}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Fretboard */}
        <div className="mb-6">
          <div className="relative w-full" ref={fretboardRef}>
            {/* Webcam: only show in guitar mode */}
            {cameraModalOpen && (
              <div className="absolute inset-0 z-0">
                <WebCam />
              </div>
            )}

            <div className={`relative z-10 mb-2 ${cameraModalOpen ? 'opacity-40 pointer-events-none' : ''}`} style={{ height: '220px' }}>
              <div className="absolute top-0 bottom-0 w-1 bg-rose-500 z-10" style={{ left: `${labelWidth}px` }}></div>
              {[...Array(FRET_COUNT)].map((_, fretIndex) => (
                <div
                  key={fretIndex}
                  className="absolute top-0 bottom-0 w-px bg-gray-300 z-10"
                  style={{ left: `${labelWidth + fretSpacing * (fretIndex + 1)}px` }}
                ></div>
              ))}
              {STANDARD_TUNING.map((stringNote, stringIndex) => (
                <div key={stringIndex} className="absolute w-full" style={{ top: `${stringIndex * 36 + 10}px` }}>
                  <div className="absolute left-0 text-center font-bold text-[#ef5151]" style={{ width: `${labelWidth}px` }}>
                    {stringNote.replace(/\d+$/, '')}
                  </div>
                  <div className={`absolute h-px ${stringIndex < 3 ? 'bg-gray-500' : 'bg-gray-400'} z-1`} style={{ left: `${labelWidth}px`, right: '0' }}></div>
                  {currentPositions.filter(pos => pos.stringIndex === stringIndex).map(pos => {
                    const validFret = Math.max(0, Math.min(pos.fret, FRET_COUNT));
                    return (
                      <div
                        key={`${stringIndex}-${validFret}`}
                        className={`absolute w-8 h-8 ${currentNoteColor} rounded-full flex items-center justify-center z-20 shadow-md`}
                        style={{ left: `${labelWidth + validFret * fretSpacing - 16}px`, top: '-16px' }}
                      >
                        <span className="text-white text-xs font-bold">{currentNoteDisplayName}</span>
                      </div>
                    );
                  })}
                  {nextNotePositions.filter(pos => pos.stringIndex === stringIndex).map(pos => {
                    const validFret = Math.max(0, Math.min(pos.fret, FRET_COUNT));
                    return (
                      <div
                        key={`next-${stringIndex}-${validFret}`}
                        className={`absolute w-6 h-6 ${nextNoteColor} rounded-full flex items-center justify-center z-15 shadow-md opacity-70`}
                        style={{ left: `${labelWidth + validFret * fretSpacing - 12}px`, top: '-12px' }}
                      >
                        <span className="text-white text-xs font-bold">{nextNoteDisplayName}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex mt-4 overflow-x-auto" style={{ paddingLeft: `${labelWidth}px` }}>
              {[...Array(FRET_COUNT + 1)].map((_, fretIndex) => (
                <div key={fretIndex} className="text-center text-xs flex-shrink-0 text-[#ef5151]" style={{ width: `${fretSpacing}px` }}>
                  {fretIndex}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Play Controls */}
        <div className="mb-6 flex justify-center space-x-4 ">
          <CoolButton
            label={isPlaying ? "Stop" : "Play"}
            onClick={playSequence}
            iconRight={isPlaying ? <CirclePause size={16} /> : <CirclePlay size={16} />}
          ></CoolButton>

          {mode === 'guitar' && (
            <CoolButton
              label ="Open Camera"
              onClick={() => setCameraModalOpen(true)}
              iconRight={ <Camera/>}
            />
              
          )}
        </div>
        
        {/* Score & Feedback */}
        <div className="mb-6 text-center">
          <div className="text-xl font-semibold mb-2">Score: {score} / {totalNotes}</div>
          {feedback && (
            <div className={`text-lg font-medium ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>
              {feedback}
            </div>
          )}
        </div>
        
        {/* Results Screen */}
        {showResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-orange-500s p-8 rounded-lg shadow-xl max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Results</h2>
              <div className="mb-6 text-center">
                <div className="text-4xl font-bold text-[#eb3d5f] mb-2">{score}/{totalNotes}</div>
                <div className="text-gray-600">
                  {score === totalNotes ? 'Perfect!' : score >= totalNotes * 0.8 ? 'Great job!' : score >= totalNotes * 0.6 ? 'Good effort!' : 'Keep practicing!'}
                </div>
              </div>
              <div className="flex justify-center">
                <CoolButton 
                label={"Play Again"}
                onClick={playSequence} 
                className="px-6 py-2 text-white rounded-md font-bold transition-colors">
                </CoolButton>
              </div>
            </div>
          </div>
        )}
        
        {/* Note Color Legend */}

        <div className="mt-8">
          <div className="mt-4 p-4 bg-pink-100 rounded-lg shadow-xl border border-pink-300">
            <h3 className="text-lg font-semibold mb-4 text-purple-800">🎵 Note Color Legend:</h3>
            <div className="text-black grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((note) => (
                <div key={note} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full ${getNoteColor(note)} mr-2`}></div>
                  <span className="text-sm font-medium">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>

      {/* WebCam Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-opacity-60 flex items-center justify-center">
          <div className="border-[conic-gradient(from_0deg,#9722b6_20deg,#8b5cf6_140deg,transparent_240deg)] relative w-[95vw] max-w-5xl aspect-[16/9] rounded-lg overflow-hidden shadow-2xl">
            {/* WebCam Background */}
            <div className="absolute inset-0 z-0">
              <WebCam />
            </div>

            {/* Fretboard Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col">
              <div className="p-4 font-bold text-xl text-center bg-gradient-to-r from-[#9722b6] to-[#fe5b35] bg-clip-text text-transparent">
                Fretboard Practice View
              </div>

              {/* Reuse the fretboard logic inside here */}
              <div className="flex-grow overflow-hidden p-2">
                <div className="relative w-full h-full">
                  <div className="relative z-10 w-full h-full">
                    {STANDARD_TUNING.map((stringNote, stringIndex) => (
                      <div
                        key={stringIndex}
                        className="absolute w-full"
                        style={{ top: `${stringIndex * 36 + 10}px` }}
                      >
                        {currentPositions
                          .filter((pos) => pos.stringIndex === stringIndex)
                          .map((pos) => {
                            const validFret = Math.max(0, Math.min(pos.fret, FRET_COUNT));
                            return (
                              <div
                                key={`${stringIndex}-${validFret}`}
                                className={`absolute w-8 h-8 ${currentNoteColor} rounded-full flex items-center justify-center z-20 shadow-md top-20`}
                                style={{
                                  left: `${labelWidth + validFret * fretSpacing + 45}px`,
                                  top: "100px",
                                }}
                              >
                                <span className="text-white text-xs font-bold">
                                  {currentNoteDisplayName}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setCameraModalOpen(false)}
              className="absolute top-2 right-2 z-20 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              ✕
            </button>

            <div className="absolute bottom-4 w-full z-20 flex justify-center">
              <CoolButton
                label={isPlaying ? "Stop" : "Play"}
                onClick={playSequence}
                
              >
              </CoolButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function GuitarFretboardVisualizer() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <GuitarFretboardVisualizerContent />
    </Suspense>
  );
}
