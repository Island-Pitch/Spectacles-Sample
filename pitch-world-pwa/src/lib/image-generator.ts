/**
 * ImageGenerator — Web-portable image generation client
 * Ported from Spectacles AI Playground (ImageGenerator.ts)
 * Returns image URLs or base64 data URLs instead of Lens Textures
 */

export type ImageProvider = "gemini" | "openai";

export interface GeneratedImage {
  url: string;
  provider: ImageProvider;
  prompt: string;
}

export class ImageGenerator {
  private baseUrl: string;
  private provider: ImageProvider;

  constructor(provider: ImageProvider = "gemini", baseUrl = "/api") {
    this.provider = provider;
    this.baseUrl = baseUrl;
  }

  async generateImage(prompt: string): Promise<GeneratedImage> {
    if (this.provider === "openai") {
      return this.generateWithOpenAI(prompt);
    }
    return this.generateWithGemini(prompt);
  }

  private async generateWithGemini(prompt: string): Promise<GeneratedImage> {
    const res = await fetch(`${this.baseUrl}/gemini/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error(`Gemini image error (${res.status}): ${await res.text()}`);

    const data = await res.json();
    return {
      url: data.imageUrl || `data:image/png;base64,${data.base64}`,
      provider: "gemini",
      prompt,
    };
  }

  private async generateWithOpenAI(prompt: string): Promise<GeneratedImage> {
    const res = await fetch(`${this.baseUrl}/openai/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: "dall-e-3" }),
    });

    if (!res.ok) throw new Error(`OpenAI image error (${res.status}): ${await res.text()}`);

    const data = await res.json();
    return {
      url: data.url || `data:image/png;base64,${data.b64_json}`,
      provider: "openai",
      prompt,
    };
  }
}
