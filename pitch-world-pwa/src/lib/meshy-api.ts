/**
 * MeshyApi — Web-portable Meshy.ai REST client
 * Ported from Spectacles AI Playground (MeshyApi.ts)
 * Uses fetch() instead of Lens Studio InternetModule
 */

export interface MeshyTaskResponse {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress: number;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
  texture_urls?: Array<{
    base_color?: string;
    metallic?: string;
    normal?: string;
    roughness?: string;
  }>;
  prompt?: string;
  task_error?: { message: string };
  created_at?: number;
  finished_at?: number;
}

export interface MeshyTextTo3DRequest {
  mode: "preview" | "refine";
  prompt?: string;
  preview_task_id?: string;
  ai_model?: string;
  topology?: "quad" | "triangle";
  target_polycount?: number;
  should_remesh?: boolean;
  enable_pbr?: boolean;
  texture_prompt?: string;
}

export interface MeshyImageTo3DRequest {
  image_url: string;
  ai_model?: string;
  topology?: "quad" | "triangle";
  target_polycount?: number;
  should_remesh?: boolean;
  enable_pbr?: boolean;
  should_texture?: boolean;
}

export class MeshyApi {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/meshy") {
    this.baseUrl = baseUrl;
  }

  async createTextTo3DPreview(
    prompt: string,
    options?: Partial<MeshyTextTo3DRequest>
  ): Promise<string> {
    const body: MeshyTextTo3DRequest = {
      mode: "preview",
      prompt,
      ai_model: options?.ai_model || "meshy-6",
      topology: options?.topology || "triangle",
      target_polycount: options?.target_polycount || 30000,
      ...options,
    };
    body.mode = "preview";

    const response = await this.post("/text-to-3d", body);
    return response.result;
  }

  async createTextTo3DRefine(
    previewTaskId: string,
    options?: Partial<MeshyTextTo3DRequest>
  ): Promise<string> {
    const body: MeshyTextTo3DRequest = {
      mode: "refine",
      preview_task_id: previewTaskId,
      enable_pbr: options?.enable_pbr || false,
      ...options,
    };
    body.mode = "refine";

    const response = await this.post("/text-to-3d", body);
    return response.result;
  }

  async createImageTo3D(
    imageUrl: string,
    options?: Partial<MeshyImageTo3DRequest>
  ): Promise<string> {
    const body: MeshyImageTo3DRequest = {
      image_url: imageUrl,
      ai_model: options?.ai_model || "meshy-6",
      topology: options?.topology || "triangle",
      target_polycount: options?.target_polycount || 30000,
      enable_pbr: options?.enable_pbr || false,
      should_texture: options?.should_texture !== false,
      ...options,
    };

    const response = await this.post("/image-to-3d", body);
    return response.result;
  }

  async getTextTo3DTask(taskId: string): Promise<MeshyTaskResponse> {
    return this.get(`/text-to-3d/${taskId}`);
  }

  async getImageTo3DTask(taskId: string): Promise<MeshyTaskResponse> {
    return this.get(`/image-to-3d/${taskId}`);
  }

  async pollUntilComplete(
    taskId: string,
    getTaskFn: (id: string) => Promise<MeshyTaskResponse>,
    onProgress?: (progress: number, status: string) => void,
    pollIntervalMs = 3000,
    maxAttempts = 120
  ): Promise<MeshyTaskResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const task = await getTaskFn(taskId);
      onProgress?.(task.progress, task.status);

      if (task.status === "SUCCEEDED") return task;

      if (task.status === "FAILED" || task.status === "CANCELED") {
        throw new Error(
          `Meshy task failed: ${task.task_error?.message || task.status.toLowerCase()}`
        );
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
      attempts++;
    }

    throw new Error(`Meshy task timed out after ${maxAttempts * pollIntervalMs}ms`);
  }

  async textTo3DFull(
    prompt: string,
    options?: {
      refine?: boolean;
      enablePbr?: boolean;
      topology?: "quad" | "triangle";
      targetPolycount?: number;
      onProgress?: (stage: "preview" | "refine", progress: number, status: string) => void;
    }
  ): Promise<MeshyTaskResponse> {
    const previewTaskId = await this.createTextTo3DPreview(prompt, {
      topology: options?.topology,
      target_polycount: options?.targetPolycount,
    });

    const previewResult = await this.pollUntilComplete(
      previewTaskId,
      (id) => this.getTextTo3DTask(id),
      (progress, status) => options?.onProgress?.("preview", progress, status)
    );

    if (!options?.refine) return previewResult;

    const refineTaskId = await this.createTextTo3DRefine(previewTaskId, {
      enable_pbr: options?.enablePbr,
    });

    return this.pollUntilComplete(
      refineTaskId,
      (id) => this.getTextTo3DTask(id),
      (progress, status) => options?.onProgress?.("refine", progress, status)
    );
  }

  async imageTo3DFull(
    imageUrl: string,
    options?: {
      enablePbr?: boolean;
      topology?: "quad" | "triangle";
      targetPolycount?: number;
      onProgress?: (progress: number, status: string) => void;
    }
  ): Promise<MeshyTaskResponse> {
    const taskId = await this.createImageTo3D(imageUrl, {
      enable_pbr: options?.enablePbr,
      topology: options?.topology,
      target_polycount: options?.targetPolycount,
    });

    return this.pollUntilComplete(
      taskId,
      (id) => this.getImageTo3DTask(id),
      options?.onProgress
    );
  }

  private async get(path: string): Promise<MeshyTaskResponse> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`Meshy API error (${res.status}): ${await res.text()}`);
    return res.json();
  }

  private async post(path: string, body: unknown): Promise<{ result: string }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Meshy API error (${res.status}): ${await res.text()}`);
    return res.json();
  }
}
