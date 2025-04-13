"use client"

import { useRouter } from 'next/navigation'
import EditRiff from '../components/EditRiff'
import { getRiff, updateRiffNotes } from '../lib/riffStore'
import Notes from '../components/notes'

export default function EditPage() {
  const router = useRouter()
  const riff = getRiff()

  if (!riff) {
    return (
      <div className="p-8 text-red-300">
        No riff loaded. Go record one first at <a href="/create" className="underline">/create</a>
      </div>
    )
  }

  return (
    <div>
      <EditRiff riff={riff} onSave={(updatedRiff) => {updateRiffNotes(updatedRiff.notes, updatedRiff.bpm); router.push('/play')}}
        onCancel={() => router.push('/play')}
      />
    </div>
  )
}
