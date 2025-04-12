type NoteMap = {
  [timestamp: string]: string
}

type RecordingData = {
  recording: string,
  notes: NoteMap
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
