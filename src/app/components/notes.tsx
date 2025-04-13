"use client";

import { useEffect, useState } from "react";
import { Music, Music2 } from "lucide-react";

type NoteStyle = {
  top: string;
  left: string;
  fontSize: string;
  animationDelay: string;
  animationDuration: string;
};

const generateNoteStyle = (): NoteStyle => ({
  top: `-25px`,
  left: `${Math.random() * 90}%`,
  fontSize: `${12 + Math.random() * 24}px`,
  animationDelay: `${Math.random() * 5}s`,
  animationDuration: `${5 + Math.random() * 10}s`,
});

export default function Notes() {
  const [styles, setStyles] = useState<NoteStyle[][]>([]);

  useEffect(() => {
    const generate = () => {
      const set = (count: number) =>
        Array.from({ length: count }, () => generateNoteStyle());
      return [set(12), set(12), set(12), set(12)];
    };

    setStyles(generate());
  }, []);

  if (styles.length === 0) return null; 

  return (
    <div className="pointer-events-none">
      {styles[0].map((style, i) => (
        <Music2 key={`m2a-${i}`} className="absolute z-0 text-[#9722b6] animate-fall" style={style} />
      ))}
      {styles[1].map((style, i) => (
        <Music key={`m1a-${i}`} className="absolute z-0 text-[#fe5b35] animate-fall" style={style} />
      ))}
      {styles[2].map((style, i) => (
        <Music2 key={`m2b-${i}`} className="absolute z-0 text-[#fe5b35] animate-fall" style={style} />
      ))}
      {styles[3].map((style, i) => (
        <Music key={`m1b-${i}`} className="absolute z-0 text-[#9722b6] animate-fall" style={style} />
      ))}
    </div>
  );
}
