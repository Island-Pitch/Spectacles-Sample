"use client";

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
}

export function TranscriptDisplay({
  transcript,
  interimTranscript,
  isListening,
}: TranscriptDisplayProps) {
  const displayText = interimTranscript || transcript;

  if (!displayText && !isListening) return null;

  return (
    <div
      className="transcript-bubble animate-fade-in"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {displayText ? (
        <p className="text-ip-white">
          {transcript && <span>{transcript} </span>}
          {interimTranscript && (
            <span className="text-ip-white/60">{interimTranscript}</span>
          )}
        </p>
      ) : (
        <p className="text-ip-white/60">Listening...</p>
      )}
    </div>
  );
}
