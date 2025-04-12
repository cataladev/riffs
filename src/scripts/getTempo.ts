type NoteMap = {
  [timestamp: string]: string
}

type RecordingData = {
  recording: string,
  notes: NoteMap
}

const data: RecordingData = {
  "recording": "session_2025-04-11",
  "notes": {
    "0.15": "C4",
    "0.48": "E4",
    "0.92": "G4",
    "1.35": "C5",
    "1.76": "B4",
    "2.10": "A4",
    "2.45": "G4",
    "2.90": "F4",
    "3.33": "E4",
    "3.78": "D4",
    "4.21": "C4"
  }
}

/// Calculate tempo from timestamps
export function getTempo(recording: RecordingData) {
  // extract numeric timestamps
  const timestamps: number[] = Object.keys(recording.notes)
    .map(parseFloat)
    .filter((timestamp) => !isNaN(timestamp) && timestamp >= 0)

  console.log(timestamps)

  // get deltas (time change) between each
  const deltas: number[] = []
  for (let i = 1; i < timestamps.length; ++i) {
    deltas.push(timestamps[i] - timestamps[i - 1])
  }

  console.log(deltas)

  // average the deltas
  const avg = deltas.reduce((accumulator, curr) => accumulator + curr, 0) / deltas.length;

  // convert to bpm 
  return Math.ceil(60 / avg);
}
