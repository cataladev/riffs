import { Music, Music2 } from "lucide-react";

const generateNoteStyle = () => ({
  top: `-25px`,
  left: `${Math.random() * 100}%`,
  fontSize: `${12 + Math.random() * 24}px`,
  animationDelay: `${Math.random() * 5}s`,
  animationDuration: `${5 + Math.random() * 10}s`,
});

export default function Notes() {
  return (
    <>
      {[...Array(12)].map((_, i) => (
        <Music2 key={`m2a-${i}`} className="absolute z-0 text-[#9722b6] animate-fall" style={generateNoteStyle()} />
      ))}
      {[...Array(12)].map((_, i) => (
        <Music key={`m1a-${i}`} className="absolute z-0 text-[#fe5b35] animate-fall" style={generateNoteStyle()} />
      ))}
      {[...Array(12)].map((_, i) => (
        <Music2 key={`m2b-${i}`} className="absolute z-0 text-[#fe5b35] animate-fall" style={generateNoteStyle()} />
      ))}
      {[...Array(12)].map((_, i) => (
        <Music key={`m1b-${i}`} className="absolute z-0 text-[#9722b6] animate-fall" style={generateNoteStyle()} />
      ))}
    </>
  );
}
