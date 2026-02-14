"use client";

import { useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import type { Group } from "three";
import type { SceneObject } from "@/lib/scene-orchestrator";

interface ModelInstanceProps {
  sceneObject: SceneObject;
}

export function ModelInstance({ sceneObject }: ModelInstanceProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(sceneObject.modelUrl!);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...sceneObject.position);
      groupRef.current.rotation.set(...sceneObject.rotation);
      groupRef.current.scale.set(...sceneObject.scale);
    }
  }, [sceneObject.position, sceneObject.rotation, sceneObject.scale]);

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}
