"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SpeechRecognizer, type RecognizerState } from "@/voice/speech-recognizer";

interface UseVoiceCommandReturn {
  isListening: boolean;
  state: RecognizerState;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => Promise<string>;
  toggleListening: () => void;
}

export function useVoiceCommand(): UseVoiceCommandReturn {
  const [state, setState] = useState<RecognizerState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const accumulatedRef = useRef("");

  useEffect(() => {
    recognizerRef.current = new SpeechRecognizer({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          accumulatedRef.current += (accumulatedRef.current ? " " : "") + text;
          setTranscript(accumulatedRef.current);
          setInterimTranscript("");
        } else {
          setInterimTranscript(text);
        }
      },
      onStateChange: (newState) => setState(newState),
      onError: (error) => console.error("Voice:", error),
    });

    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    accumulatedRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    recognizerRef.current?.start();
  }, []);

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      recognizerRef.current?.stop();

      // Resolve after a short delay for final transcript
      setTimeout(() => {
        const final = accumulatedRef.current.trim();
        resolveRef.current?.(final);
        resolveRef.current = null;
      }, 600);
    });
  }, []);

  const toggleListening = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  return {
    isListening: state === "listening",
    state,
    transcript,
    interimTranscript,
    isSupported: recognizerRef.current?.isSupported ?? false,
    startListening,
    stopListening,
    toggleListening,
  };
}
