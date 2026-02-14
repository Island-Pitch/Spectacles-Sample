"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { ModelInstance } from "./model-loader";
import type { SceneObject } from "@/lib/scene-orchestrator";

interface SceneManagerProps {
  objects: SceneObject[];
}

export function SceneManager({ objects }: SceneManagerProps) {
  const placedObjects = objects.filter(
    (o) => o.status === "placed" && o.modelUrl
  );

  return (
    <div className="three-overlay">
      <Canvas
        camera={{ position: [0, 1.5, 0], fov: 60 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />

        <Suspense fallback={null}>
          <Environment preset="city" background={false} />

          {placedObjects.map((obj) => (
            <ModelInstance key={obj.id} sceneObject={obj} />
          ))}
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 0.5, -2]}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
