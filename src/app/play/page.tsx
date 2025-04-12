"use client";

import WebCam from "../components/Camera/WebCamera";
import PlayRiff from "../components/PlayRiff";

export default function PlayPage() {
  return (
      <div className="text-center">
        <h2 className="text-4xl font-bold mt-8">Let's riff</h2>
        <WebCam/>
      </div>

  );
}
