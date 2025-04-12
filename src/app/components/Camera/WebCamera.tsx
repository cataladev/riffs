"use client";

import { useEffect, useRef } from "react";
import GuitarHero from "../GuitarHero/guitar";

export default function WebCam() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Store the ref value in a variable
    const videoElement = videoRef.current;
    
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // wait
          audio: false,
        });
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    }

    enableCamera();

    return () => {
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="w-3xl h-2xl animated-border left-1/4 top-1/10 overflow-hidden">
      <video
        className="object-cover rounded-2xl z-0"
        ref={videoRef}
        autoPlay
        playsInline
      />
      <div className="z-50 opacity-50">
      <GuitarHero/>
      </div>
    </div>
  );
}
