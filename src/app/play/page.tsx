"use client";

import WebCam from "../components/Camera/WebCamera";

export default function PlayPage() {
  return (
    <div className="p-8 text-center ">
      <h1 className="text-3xl font-bold">🎤 meow</h1>
      <p className="mt-2">This is where users play their riff.</p>
      <div className="flex justify-center mt-4">
        <WebCam />
      </div>
    </div>
  );
}
