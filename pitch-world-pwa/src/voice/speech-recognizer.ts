/**
 * SpeechRecognizer — Web Speech API wrapper
 * Provides start/stop voice recognition with transcript callbacks
 */

export type RecognizerState = "idle" | "listening" | "processing" | "error";

export interface RecognizerCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStateChange: (state: RecognizerState) => void;
  onError: (error: string) => void;
}

export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private callbacks: RecognizerCallbacks;
  private state: RecognizerState = "idle";

  constructor(callbacks: RecognizerCallbacks) {
    this.callbacks = callbacks;

    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      console.warn("SpeechRecognizer: Web Speech API not available");
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        this.callbacks.onTranscript(final.trim(), true);
      } else if (interim) {
        this.callbacks.onTranscript(interim.trim(), false);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      this.setState("error");
      this.callbacks.onError(`Speech recognition error: ${event.error}`);
    };

    this.recognition.onend = () => {
      if (this.state === "listening") {
        // Restarted unexpectedly — restart
        try {
          this.recognition?.start();
        } catch {
          this.setState("idle");
        }
      }
    };
  }

  get isSupported(): boolean {
    return this.recognition !== null;
  }

  get currentState(): RecognizerState {
    return this.state;
  }

  start(): void {
    if (!this.recognition) {
      this.callbacks.onError("Speech recognition not supported in this browser");
      return;
    }

    try {
      this.recognition.start();
      this.setState("listening");
    } catch {
      this.setState("error");
      this.callbacks.onError("Failed to start speech recognition");
    }
  }

  stop(): void {
    if (!this.recognition) return;

    this.setState("processing");
    try {
      this.recognition.stop();
    } catch {
      // Already stopped
    }
    // After a brief delay, go idle
    setTimeout(() => {
      if (this.state === "processing") this.setState("idle");
    }, 500);
  }

  private setState(state: RecognizerState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }
}

// Type augmentation for webkit prefix
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
