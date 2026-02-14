"use client";

import { useState } from "react";
import { CameraFeed } from "@/components/CameraFeed";
import { VoiceButton } from "@/components/VoiceButton";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { ProgressOverlay } from "@/components/ProgressOverlay";
import { SceneManager } from "@/three/scene-manager";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { useSceneOrchestrator } from "@/hooks/useSceneOrchestrator";
import { useAriaLive } from "@/a11y/aria-live-region";

export default function ExperiencePage() {
  const [started, setStarted] = useState(false);
  const voice = useVoiceCommand();
  const scene = useSceneOrchestrator();
  const { announce } = useAriaLive();

  async function handleVoiceToggle() {
    if (voice.isListening) {
      const transcript = await voice.stopListening();
      if (transcript) {
        announce(`Processing: ${transcript}`);
        await scene.handleTranscript(transcript);
      }
    } else {
      voice.startListening();
      announce("Listening. Describe what you want to see.");
    }
  }

  // Landing screen
  if (!started) {
    return (
      <div className="ip-gradient flex h-full flex-col items-center justify-center px-8 text-center">
        <h1 className="font-sketch text-5xl font-bold text-ip-orange mb-4">
          Pitch World
        </h1>
        <p className="text-ip-white/80 text-lg mb-2 max-w-md">
          Describe it. See it.
        </p>
        <p className="text-ip-white/50 text-sm mb-10 max-w-sm">
          An accessible AR experience by Island Pitch.
          Tap the mic, say what you want to see, and watch it appear.
        </p>
        <button
          onClick={() => setStarted(true)}
          className="rounded-ip bg-ip-orange px-8 py-4 text-lg font-semibold text-white shadow-ip transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-ip-orange/50"
          style={{ minWidth: 150, textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
        >
          Enter Experience
        </button>
        <p className="text-ip-white/30 text-xs mt-8">
          Do Cool Things the Right Way!
        </p>
      </div>
    );
  }

  // Full-screen experience
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Layer 0: Camera */}
      <CameraFeed />

      {/* Layer 1: 3D scene */}
      <SceneManager objects={scene.sceneObjects} />

      {/* Layer 2: UI overlay */}
      <div className="ui-overlay">
        {/* Top: progress indicators */}
        <div className="mt-safe flex-none pt-4">
          <ProgressOverlay objects={scene.sceneObjects} />
        </div>

        {/* Middle: spacer */}
        <div className="flex-1" />

        {/* Bottom: transcript + voice button */}
        <div className="flex flex-col items-center gap-4 pb-8">
          <TranscriptDisplay
            transcript={voice.transcript}
            interimTranscript={voice.interimTranscript}
            isListening={voice.isListening}
          />

          <VoiceButton
            isListening={voice.isListening}
            isProcessing={scene.isProcessing}
            onToggle={handleVoiceToggle}
          />

          {/* Hint text */}
          {!voice.isListening && !scene.isProcessing && scene.sceneObjects.length === 0 && (
            <p className="text-ip-white/40 text-xs text-center max-w-xs animate-fade-in">
              Tap the mic and say something like
              &ldquo;Show me a friendly robot&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
