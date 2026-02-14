"use client";

import { useState, useCallback, useRef } from "react";
import { MeshyApi, type MeshyTaskResponse } from "@/services/meshy-api";

export type GenerationStage = "idle" | "preview" | "refine" | "complete" | "error";

interface UseMeshyGenerationReturn {
  stage: GenerationStage;
  progress: number;
  modelUrl: string | null;
  error: string | null;
  generateFromText: (prompt: string, refine?: boolean) => Promise<MeshyTaskResponse>;
  generateFromImage: (imageUrl: string) => Promise<MeshyTaskResponse>;
  reset: () => void;
}

export function useMeshyGeneration(): UseMeshyGenerationReturn {
  const [stage, setStage] = useState<GenerationStage>("idle");
  const [progress, setProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(new MeshyApi());

  const generateFromText = useCallback(
    async (prompt: string, refine = false): Promise<MeshyTaskResponse> => {
      setStage("preview");
      setProgress(0);
      setModelUrl(null);
      setError(null);

      try {
        const result = await apiRef.current.textTo3DFull(prompt, {
          refine,
          enablePbr: refine,
          onProgress: (currentStage, pct) => {
            setStage(currentStage);
            setProgress(pct);
          },
        });

        const url = result.model_urls?.glb || result.model_urls?.obj || null;
        setModelUrl(url);
        setStage("complete");
        setProgress(100);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        setError(msg);
        setStage("error");
        throw e;
      }
    },
    []
  );

  const generateFromImage = useCallback(
    async (imageUrl: string): Promise<MeshyTaskResponse> => {
      setStage("preview");
      setProgress(0);
      setModelUrl(null);
      setError(null);

      try {
        const result = await apiRef.current.imageTo3DFull(imageUrl, {
          onProgress: (pct) => setProgress(pct),
        });

        const url = result.model_urls?.glb || result.model_urls?.obj || null;
        setModelUrl(url);
        setStage("complete");
        setProgress(100);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        setError(msg);
        setStage("error");
        throw e;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setModelUrl(null);
    setError(null);
  }, []);

  return { stage, progress, modelUrl, error, generateFromText, generateFromImage, reset };
}
