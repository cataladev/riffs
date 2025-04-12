"use client"

import { useEffect, useState } from "react"
import { getRiff, RiffNote } from "../lib/riffStore"
import { v4 as uuidv4 } from "uuid"

// Define vertical axis (pitches) for the piano roll, with highest pitches at the top.
const pitches = [
  "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3",
  "A3", "G3", "F3", "E3", "D3", "C3", "B2", "A2", "G2", "F2", "E2"
]

// Define horizontal time steps (e.g. 64 steps)
const timeSteps = Array.from({ length: 64 }, (_, i) => i)

type Note = RiffNote

export default function EditRiff() {
  const riff = getRiff()
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!riff) return
    setNotes(riff.notes)
  }, [riff])

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

  // Add a note if one doesn't already exist in the selected cell
  const handleAddNote = (pitch: string, time: number) => {
    const exists = notes.find((n) => n.pitch === pitch && n.time === time)
    if (exists) return
    setNotes((prev) => [...prev, { id: uuidv4(), pitch, time }])
  }

  if (!riff) {
    return (
      <div className="p-8 text-red-300">
        ⚠️ No riff loaded. Go record one first at <a href="/hum" className="underline">/hum</a>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">🛠️ Edit Your Riff (Piano Roll)</h1>
      <p className="text-white/80 mb-4">
        Session: <code>{riff.recording}</code>
      </p>

      {/* Scrollable container for the piano roll grid */}
      <div className="overflow-auto">
        <div className="inline-block border border-gray-600">
          {pitches.map((pitch) => (
            <div key={pitch} className="flex">
              {/* Left side label cell */}
              <div className="w-14 h-12 border border-gray-700 flex items-center justify-center bg-gray-800 text-white text-sm font-mono">
                {pitch}
              </div>

              {/* Time steps cells */}
              {timeSteps.map((time) => {
                // Find if a note exists on this cell
                const note = notes.find((n) => n.pitch === pitch && n.time === time)
                return (
                  <div
                    key={time}
                    className="w-14 h-12 border border-gray-700 flex items-center justify-center relative bg-black hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleAddNote(pitch, time)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const noteId = e.dataTransfer.getData("text/plain")
                      handleMoveNote(noteId, pitch, time)
                    }}
                  >
                    {note && (
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", note.id)
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          handleDeleteNote(note.id)
                        }}
                        className="w-6 h-6 bg-yellow-400 rounded-full cursor-move"
                        title={`Pitch ${pitch}, Time ${time}`}
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
        <h2 className="text-lg font-semibold mb-2">📝 Riff Notes</h2>
        <ul className="text-sm text-white/80">
          {notes.map((note) => (
            <li key={note.id}>
              Pitch <strong>{note.pitch}</strong> – Time <strong>{note.time}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
