import { setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";

/**
 * Meshy.ai API response types
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
  task_error?: {
    message: string;
  };
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

/**
 * MeshyApi - Low-level Meshy.ai REST API client for Lens Studio
 *
 * Handles HTTP communication with the Meshy.ai API endpoints
 * for text-to-3D and image-to-3D generation with async polling.
 */
export class MeshyApi {
  private apiKey: string;
  private baseUrl: string = "https://api.meshy.ai/openapi/v2";
  private internetModule: InternetModule =
    require("LensStudio:InternetModule") as InternetModule;
  private enableDebugLogging: boolean;

  constructor(apiKey: string, enableDebugLogging: boolean = false) {
    this.apiKey = apiKey;
    this.enableDebugLogging = enableDebugLogging;
  }

  /**
   * Create a text-to-3D preview task
   */
  public async createTextTo3DPreview(
    prompt: string,
    options?: Partial<MeshyTextTo3DRequest>
  ): Promise<string> {
    const body: MeshyTextTo3DRequest = {
      mode: "preview",
      prompt: prompt,
      ai_model: options?.ai_model || "meshy-6",
      topology: options?.topology || "triangle",
      target_polycount: options?.target_polycount || 30000,
      ...options,
    };
    // Ensure mode and prompt are always set from function parameters
    body.mode = "preview";
    body.prompt = prompt;

    if (this.enableDebugLogging) {
      print(`MeshyApi: Submitting text-to-3D preview: "${prompt}"`);
    }

    const response = await this.post(`${this.baseUrl}/text-to-3d`, body);
    const taskId = response.result;

    if (this.enableDebugLogging) {
      print(`MeshyApi: Created preview task: ${taskId}`);
    }

    return taskId;
  }

  /**
   * Create a text-to-3D refine task from a completed preview
   */
  public async createTextTo3DRefine(
    previewTaskId: string,
    options?: Partial<MeshyTextTo3DRequest>
  ): Promise<string> {
    const body: MeshyTextTo3DRequest = {
      mode: "refine",
      preview_task_id: previewTaskId,
      enable_pbr: options?.enable_pbr || false,
      ...options,
    };
    // Ensure mode and preview_task_id are always set from function parameters
    body.mode = "refine";
    body.preview_task_id = previewTaskId;

    if (this.enableDebugLogging) {
      print(
        `MeshyApi: Submitting text-to-3D refine for preview: ${previewTaskId}`
      );
    }

    const response = await this.post(`${this.baseUrl}/text-to-3d`, body);
    const taskId = response.result;

    if (this.enableDebugLogging) {
      print(`MeshyApi: Created refine task: ${taskId}`);
    }

    return taskId;
  }

  /**
   * Create an image-to-3D task
   */
  public async createImageTo3D(
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
    // Ensure image_url is always set from function parameter
    body.image_url = imageUrl;

    if (this.enableDebugLogging) {
      print(`MeshyApi: Submitting image-to-3D`);
    }

    // Image-to-3D uses v1 endpoint
    const response = await this.post(
      "https://api.meshy.ai/openapi/v1/image-to-3d",
      body
    );
    const taskId = response.result;

    if (this.enableDebugLogging) {
      print(`MeshyApi: Created image-to-3D task: ${taskId}`);
    }

    return taskId;
  }

  /**
   * Get the status of a text-to-3D task
   */
  public async getTextTo3DTask(taskId: string): Promise<MeshyTaskResponse> {
    return this.get(`${this.baseUrl}/text-to-3d/${taskId}`);
  }

  /**
   * Get the status of an image-to-3D task
   */
  public async getImageTo3DTask(taskId: string): Promise<MeshyTaskResponse> {
    return this.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`);
  }

  /**
   * Poll a task until it completes or fails
   * @param taskId The task ID to poll
   * @param getTaskFn Function to retrieve task status
   * @param onProgress Optional callback for progress updates
   * @param pollIntervalMs Polling interval in milliseconds (default 3000)
   * @param maxAttempts Maximum polling attempts (default 120 = ~6 minutes)
   */
  public async pollUntilComplete(
    taskId: string,
    getTaskFn: (id: string) => Promise<MeshyTaskResponse>,
    onProgress?: (progress: number, status: string) => void,
    pollIntervalMs: number = 3000,
    maxAttempts: number = 120
  ): Promise<MeshyTaskResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const task = await getTaskFn(taskId);

      if (onProgress) {
        onProgress(task.progress, task.status);
      }

      if (this.enableDebugLogging && attempts % 5 === 0) {
        print(
          `MeshyApi: Task ${taskId} - Status: ${task.status}, Progress: ${task.progress}%`
        );
      }

      if (task.status === "SUCCEEDED") {
        return task;
      }

      if (task.status === "FAILED" || task.status === "CANCELED") {
        const errorMsg =
          task.task_error?.message || `Task ${task.status.toLowerCase()}`;
        throw new Error(`Meshy task failed: ${errorMsg}`);
      }

      // Wait before polling again
      await this.delay(pollIntervalMs);
      attempts++;
    }

    throw new Error(
      `Meshy task timed out after ${maxAttempts * pollIntervalMs}ms`
    );
  }

  /**
   * Full text-to-3D pipeline: preview, poll, optionally refine, poll
   */
  public async textTo3DFull(
    prompt: string,
    options?: {
      refine?: boolean;
      enablePbr?: boolean;
      topology?: "quad" | "triangle";
      targetPolycount?: number;
      onProgress?: (
        stage: "preview" | "refine",
        progress: number,
        status: string
      ) => void;
    }
  ): Promise<MeshyTaskResponse> {
    // Stage 1: Preview
    const previewTaskId = await this.createTextTo3DPreview(prompt, {
      topology: options?.topology,
      target_polycount: options?.targetPolycount,
    });

    const previewResult = await this.pollUntilComplete(
      previewTaskId,
      (id) => this.getTextTo3DTask(id),
      (progress, status) => {
        if (options?.onProgress) {
          options.onProgress("preview", progress, status);
        }
      }
    );

    // If no refine requested, return preview result
    if (!options?.refine) {
      return previewResult;
    }

    // Stage 2: Refine
    const refineTaskId = await this.createTextTo3DRefine(previewTaskId, {
      enable_pbr: options?.enablePbr,
    });

    const refineResult = await this.pollUntilComplete(
      refineTaskId,
      (id) => this.getTextTo3DTask(id),
      (progress, status) => {
        if (options?.onProgress) {
          options.onProgress("refine", progress, status);
        }
      }
    );

    return refineResult;
  }

  /**
   * Full image-to-3D pipeline: create task, poll until done
   */
  public async imageTo3DFull(
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

  /**
   * HTTP GET request
   */
  private async get(url: string): Promise<any> {
    const response = await this.internetModule.fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      const text = await response.text();
      throw new Error(`Meshy API error (${response.status}): ${text}`);
    }

    return response.json();
  }

  /**
   * HTTP POST request
   */
  private async post(url: string, body: any): Promise<any> {
    const response = await this.internetModule.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200 && response.status !== 202) {
      const text = await response.text();
      throw new Error(`Meshy API error (${response.status}): ${text}`);
    }

    return response.json();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), ms);
    });
  }
}
