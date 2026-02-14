"use client";

import { useState, useCallback, useRef } from "react";
import {
  SceneOrchestrator,
  type SceneObject,
  type SceneCommand,
} from "@/services/scene-orchestrator";
import { MeshyApi } from "@/services/meshy-api";
import { SpeechSynthesizer } from "@/voice/speech-synthesizer";

interface UseSceneOrchestratorReturn {
  sceneObjects: SceneObject[];
  isProcessing: boolean;
  lastCommand: SceneCommand | null;
  handleTranscript: (transcript: string) => Promise<void>;
  clearScene: () => void;
}

let objectCounter = 0;

export function useSceneOrchestrator(): UseSceneOrchestratorReturn {
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<SceneCommand | null>(null);

  const orchestratorRef = useRef(new SceneOrchestrator());
  const meshyRef = useRef(new MeshyApi());
  const synthRef = useRef(new SpeechSynthesizer());

  const updateObjects = useCallback(() => {
    setSceneObjects([...orchestratorRef.current.getSceneObjects()]);
  }, []);

  const handleTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      setIsProcessing(true);
      synthRef.current.speak("Processing your request");

      try {
        // Parse the voice command
        const command = await orchestratorRef.current.parseTranscript(transcript);
        setLastCommand(command);

        switch (command.intent) {
          case "create": {
            const id = `obj_${++objectCounter}_${Date.now()}`;
            const position = orchestratorRef.current.placementToPosition(
              command.placementHint
            );

            const sceneObj: SceneObject = {
              id,
              description: command.objectDescription,
              position,
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              status: "generating",
              progress: 0,
            };

            orchestratorRef.current.addSceneObject(sceneObj);
            updateObjects();

            synthRef.current.speak(`Creating ${command.objectDescription}`);

            // Generate the 3D model
            const result = await meshyRef.current.textTo3DFull(
              command.objectDescription,
              {
                onProgress: (stage, pct) => {
                  orchestratorRef.current.updateSceneObject(id, {
                    progress: pct,
                    status: "generating",
                  });
                  updateObjects();
                  synthRef.current.announceProgress(
                    command.objectDescription,
                    pct
                  );
                },
              }
            );

            const modelUrl = result.model_urls?.glb || result.model_urls?.obj;
            orchestratorRef.current.updateSceneObject(id, {
              modelUrl,
              status: modelUrl ? "placed" : "error",
              progress: 100,
            });
            updateObjects();

            if (modelUrl) {
              synthRef.current.speak(
                `${command.objectDescription} is ready`,
                "assertive"
              );
            }
            break;
          }

          case "remove": {
            const objects = orchestratorRef.current.getSceneObjects();
            if (objects.length > 0) {
              const last = objects[objects.length - 1];
              orchestratorRef.current.removeSceneObject(last.id);
              updateObjects();
              synthRef.current.speak(`Removed ${last.description}`);
            }
            break;
          }

          case "clear": {
            orchestratorRef.current.clearScene();
            updateObjects();
            synthRef.current.speak("Scene cleared");
            break;
          }

          case "describe": {
            const objs = orchestratorRef.current.getSceneObjects();
            const desc =
              objs.length === 0
                ? "The scene is empty. Tell me what to create."
                : `The scene has ${objs.length} object${objs.length > 1 ? "s" : ""}: ${objs.map((o) => o.description).join(", ")}`;
            synthRef.current.speak(desc);
            break;
          }

          default:
            synthRef.current.speak(
              "I'm not sure what to do with that. Try describing an object to create."
            );
        }
      } catch (e) {
        console.error("Scene orchestrator error:", e);
        synthRef.current.speak("Something went wrong. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [updateObjects]
  );

  const clearScene = useCallback(() => {
    orchestratorRef.current.clearScene();
    updateObjects();
  }, [updateObjects]);

  return { sceneObjects, isProcessing, lastCommand, handleTranscript, clearScene };
}
