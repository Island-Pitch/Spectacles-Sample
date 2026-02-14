/**
 * SpeechSynthesizer — Accessible narration for progress and status
 * "Building your robot... 60% done"
 */

export class SpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    }
  }

  get isSupported(): boolean {
    return this.synth !== null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  speak(text: string, priority: "polite" | "assertive" = "polite"): void {
    if (!this.synth || !this.enabled) return;

    if (priority === "assertive") {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth?.cancel();
  }

  announceProgress(label: string, percent: number): void {
    // Only announce at milestones to avoid spam
    if (percent % 25 === 0 || percent === 100) {
      const msg =
        percent === 100
          ? `${label} is ready`
          : `${label}, ${percent} percent`;
      this.speak(msg);
    }
  }
}
