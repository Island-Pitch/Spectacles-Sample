"use client";

import type { SceneObject } from "@/lib/scene-orchestrator";

interface ProgressOverlayProps {
  objects: SceneObject[];
}

export function ProgressOverlay({ objects }: ProgressOverlayProps) {
  const generating = objects.filter((o) => o.status === "generating");

  if (generating.length === 0) return null;

  return (
    <div
      className="flex flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {generating.map((obj) => (
        <div key={obj.id} className="progress-pill">
          <svg
            className="h-4 w-4 animate-spin text-ip-orange"
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
          <span className="text-ip-white">
            {obj.description} — {obj.progress}%
          </span>
        </div>
      ))}
    </div>
  );
}
