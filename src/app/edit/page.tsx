"use client"

import { useRouter } from 'next/navigation'
import EditRiff from '../components/EditRiff'
import { getRiff, Riff, updateRiffNotes } from '../lib/riffStore'

export default function EditPage() {
  const router = useRouter()
  const riff = getRiff()

  if (!riff) {
    return (
      <div className="p-8 text-red-300">
        ⚠️ No riff loaded. Go record one first at <a href="/create" className="underline">/create</a>
      </div>
    )
  }

  return (
    <EditRiff 
      riff={riff}
      onSave={(updatedRiff: Riff) => {
        updateRiffNotes(updatedRiff.notes, updatedRiff.bpm)
        router.push('/play')
      }}
      onCancel={() => router.push('/play')}
    />
  )
}
