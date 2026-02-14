"use client";

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function VoiceButton({
  isListening,
  isProcessing,
  onToggle,
  disabled = false,
}: VoiceButtonProps) {
  const label = isProcessing
    ? "Processing your request"
    : isListening
      ? "Tap to stop talking"
      : "Tap to start talking";

  return (
    <button
      className="voice-btn"
      onClick={onToggle}
      disabled={disabled || isProcessing}
      aria-pressed={isListening}
      aria-label={label}
      aria-live="polite"
    >
      {/* Ripple rings when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 animate-ripple rounded-full bg-white/20" />
          <span
            className="absolute inset-0 animate-ripple rounded-full bg-white/20"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      )}

      {/* Icon */}
      {isProcessing ? (
        <svg
          className="h-8 w-8 animate-spin text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="31.4 31.4"
            strokeLinecap="round"
          />
        </svg>
      ) : isListening ? (
        <svg
          className="h-8 w-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          className="h-8 w-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
          <path d="M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V23h2v-3.06A9 9 0 0 0 21 11h-2z" />
        </svg>
      )}
    </button>
  );
}
