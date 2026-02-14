"use client";

import { useRef, useEffect, useState } from "react";

interface CameraFeedProps {
  onStreamReady?: (stream: MediaStream) => void;
}

export function CameraFeed({ onStreamReady }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          onStreamReady?.(stream);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera access denied";
        console.error("Camera error:", msg);
        setError(msg);
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onStreamReady]);

  if (error) {
    return (
      <div className="camera-feed ip-gradient flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-ip-white/80 text-lg font-medium mb-2">
            Camera access needed
          </p>
          <p className="text-ip-white/50 text-sm">
            Allow camera access to see AR objects in your space, or continue
            with voice-only mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="camera-feed"
      autoPlay
      playsInline
      muted
      aria-hidden="true"
    />
  );
}
