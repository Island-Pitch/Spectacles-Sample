/**
 * SceneOrchestrator — The brain of Pitch World
 *
 * Takes raw voice transcript and uses Gemini to:
 * 1. Parse intent (create, modify, remove, describe)
 * 2. Extract object description for 3D generation
 * 3. Determine placement hints (floor, wall, table, near-camera)
 * 4. Return structured commands for the rendering layer
 */

export type SceneIntent =
  | "create"
  | "modify"
  | "remove"
  | "describe"
  | "clear"
  | "unknown";

export type PlacementHint =
  | "floor"
  | "wall"
  | "table"
  | "floating"
  | "near-camera"
  | "center";

export interface SceneCommand {
  intent: SceneIntent;
  objectDescription: string;
  placementHint: PlacementHint;
  modifiers: string[];
  originalTranscript: string;
  confidence: number;
}

export interface SceneObject {
  id: string;
  description: string;
  modelUrl?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  status: "generating" | "loading" | "placed" | "error";
  progress: number;
}

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Scene Orchestrator for Pitch World, an accessible AR experience.
You receive voice transcripts from users and extract structured commands for 3D scene building.

Respond with ONLY valid JSON matching this schema:
{
  "intent": "create" | "modify" | "remove" | "describe" | "clear" | "unknown",
  "objectDescription": "concise description for 3D model generation (max 100 chars)",
  "placementHint": "floor" | "wall" | "table" | "floating" | "near-camera" | "center",
  "modifiers": ["color:blue", "size:large", etc],
  "confidence": 0.0-1.0
}

Rules:
- "create": user wants a new 3D object ("show me", "put a", "add", "make", "I want")
- "modify": user wants to change an existing object ("make it bigger", "change color", "move it")
- "remove": user wants to remove something ("remove", "delete", "get rid of")
- "describe": user is asking about what they see, not requesting changes
- "clear": user wants to start over ("clear everything", "reset", "start over")
- For objectDescription, write a clear prompt suitable for a text-to-3D AI model
- Infer placement from context: furniture goes on floor, art on wall, small items on table
- Keep modifiers as key:value pairs for easy parsing`;

export class SceneOrchestrator {
  private apiBaseUrl: string;
  private sceneObjects: Map<string, SceneObject> = new Map();

  constructor(apiBaseUrl = "/api") {
    this.apiBaseUrl = apiBaseUrl;
  }

  async parseTranscript(transcript: string): Promise<SceneCommand> {
    const res = await fetch(`${this.apiBaseUrl}/gemini/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        message: transcript,
      }),
    });

    if (!res.ok) {
      console.error("Scene orchestrator parse failed:", res.status);
      return {
        intent: "unknown",
        objectDescription: transcript,
        placementHint: "center",
        modifiers: [],
        originalTranscript: transcript,
        confidence: 0,
      };
    }

    const data = await res.json();

    try {
      const text: string = data.response || data.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || "unknown",
        objectDescription: parsed.objectDescription || transcript,
        placementHint: parsed.placementHint || "center",
        modifiers: parsed.modifiers || [],
        originalTranscript: transcript,
        confidence: parsed.confidence ?? 0.5,
      };
    } catch {
      return {
        intent: "create",
        objectDescription: transcript,
        placementHint: "center",
        modifiers: [],
        originalTranscript: transcript,
        confidence: 0.3,
      };
    }
  }

  addSceneObject(obj: SceneObject): void {
    this.sceneObjects.set(obj.id, obj);
  }

  updateSceneObject(id: string, updates: Partial<SceneObject>): void {
    const existing = this.sceneObjects.get(id);
    if (existing) {
      this.sceneObjects.set(id, { ...existing, ...updates });
    }
  }

  removeSceneObject(id: string): void {
    this.sceneObjects.delete(id);
  }

  clearScene(): void {
    this.sceneObjects.clear();
  }

  getSceneObjects(): SceneObject[] {
    return Array.from(this.sceneObjects.values());
  }

  getSceneObject(id: string): SceneObject | undefined {
    return this.sceneObjects.get(id);
  }

  placementToPosition(hint: PlacementHint): [number, number, number] {
    switch (hint) {
      case "floor":
        return [0, 0, -2];
      case "wall":
        return [0, 1.5, -3];
      case "table":
        return [0, 0.8, -1.5];
      case "floating":
        return [0, 1.2, -2];
      case "near-camera":
        return [0, 0, -1];
      case "center":
      default:
        return [0, 0.5, -2];
    }
  }
}
