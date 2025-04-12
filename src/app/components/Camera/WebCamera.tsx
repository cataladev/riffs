"use client";

import { useEffect, useRef } from "react";

export default function WebCam() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // wait
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    }

    enableCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div>
      <video
        className="w-3xl rounded-2xl border-orange border-8"
        ref={videoRef}
        autoPlay
        playsInline
      />
    </div>
  );
}
