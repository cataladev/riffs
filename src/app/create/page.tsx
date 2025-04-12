import HumRecorder from "../components/HumRecorder"
import Notes from "../components/notes"

export default function CreatePage() {
  return (
    <div className="p-8">
      <Notes/>
      <HumRecorder />
    </div>
  )
}
