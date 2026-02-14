import { MeshyApi, MeshyTaskResponse } from "./MeshyApi";
import { setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";

/**
 * MeshyModelGen - 3D Model Factory using Meshy.ai API
 *
 * Drop-in alternative to ModelGen (Snap3D) that uses Meshy.ai for 3D generation.
 * Follows the same callback interface so it integrates with ModelGenBridge and
 * the GenerationQueue system.
 *
 * Capabilities beyond Snap3D:
 * - Image-to-3D: generate 3D models from photos/images
 * - PBR textures: metallic, roughness, normal maps
 * - Topology control: quad vs triangle, target polycount
 * - Mesh refinement with texture application
 */
@component
export class MeshyModelGen extends BaseScriptComponent {
  @input
  @hint("Meshy.ai API key (msy_...)")
  private apiKey: string = "";

  @input
  @allowUndefined
  @hint("Scene object reference for the 3D model position")
  private targetPosition: SceneObject;

  @input
  @hint("Enable mesh refinement (preview + refine stages)")
  private refineMesh: boolean = false;

  @input
  @hint("Generate PBR texture maps (metallic, roughness, normal)")
  private enablePbr: boolean = false;

  @input
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Triangle", "triangle"),
      new ComboBoxItem("Quad", "quad"),
    ])
  )
  @hint("Mesh topology type")
  private topology: string = "triangle";

  @input
  @hint("Target polygon count for generated models")
  @widget(new SliderWidget(1000, 100000, 1000))
  private targetPolycount: number = 30000;

  @input
  @hint("Default model scale for generated objects")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  private defaultScale: number = 1.0;

  @input
  @hint("Enable debug logging")
  private enableDebugLogging: boolean = false;

  private meshyApi: MeshyApi;
  private rmm = require("LensStudio:RemoteMediaModule") as RemoteMediaModule;
  private rsm = require("LensStudio:RemoteServiceModule") as RemoteServiceModule;
  private isGenerating: boolean = false;

  // Callback maps matching ModelGen's interface
  private modelCallbacks: Map<
    string,
    (model: GltfAsset, isFinal: boolean) => void
  > = new Map();
  private failureCallbacks: Map<string, (error: string) => void> = new Map();
  private progressCallbacks: Map<
    string,
    (stage: string, progress: number) => void
  > = new Map();

  private activeRequestId: string = null;

  onAwake() {
    if (!this.apiKey || this.apiKey.trim() === "") {
      print("MeshyModelGen: No API key provided - set apiKey input");
      return;
    }

    this.meshyApi = new MeshyApi(this.apiKey, this.enableDebugLogging);

    if (this.enableDebugLogging) {
      print("MeshyModelGen: Meshy.ai 3D model factory initialized");
    }
  }

  /**
   * Generate 3D model from text prompt using Meshy.ai
   * Compatible with ModelGen's interface for use with ModelGenBridge
   */
  public async generateModel(
    prompt: string,
    overridePosition?: vec3,
    requestId?: string
  ): Promise<string> {
    this.isGenerating = true;

    const currentRequestId =
      requestId || `meshy_${Date.now()}_${Math.random()}`;
    this.activeRequestId = currentRequestId;

    try {
      if (!prompt || prompt.trim() === "") {
        throw new Error("MeshyModelGen: Invalid prompt provided");
      }

      if (!this.meshyApi) {
        throw new Error("MeshyModelGen: API not initialized - check API key");
      }

      if (this.enableDebugLogging) {
        print(
          `MeshyModelGen: Generating text-to-3D: "${prompt}" (requestId: ${currentRequestId})`
        );
      }
      const result = await this.meshyApi.textTo3DFull(prompt, {
        refine: this.refineMesh,
        enablePbr: this.enablePbr,
        topology: this.topology as "quad" | "triangle",
        targetPolycount: this.targetPolycount,
        onProgress: (stage, progress, status) => {
          this.notifyProgressCallbacks(currentRequestId, stage, progress);

          if (this.enableDebugLogging && progress % 25 === 0) {
            print(
              `MeshyModelGen: [${stage}] Progress: ${progress}% (${status})`
            );
          }
        },
      });

      // Load the GLB model from the result URL
      if (!result.model_urls?.glb) {
        const errorMsg = "MeshyModelGen: No GLB URL in API response";
        throw new Error(errorMsg);
      }

      await this.loadGlbFromUrl(
        result.model_urls.glb,
        currentRequestId,
        true
      );

      const resultMsg = `Successfully created ${this.refineMesh ? "refined " : ""}mesh with prompt: ${prompt}`;

      if (this.enableDebugLogging) {
        print(`MeshyModelGen: ${resultMsg}`);
      }

      return resultMsg;
    } catch (error) {
      if (this.enableDebugLogging) {
        print(`MeshyModelGen: Error: ${error}`);
      }

      this.notifyFailureCallbacks(currentRequestId, error.toString());
      throw error;
    } finally {
      this.isGenerating = false;
      this.activeRequestId = null;
    }
  }

  /**
   * Generate 3D model from an image URL using Meshy.ai
   * This is a capability Snap3D does not have.
   */
  public async generateModelFromImage(
    imageUrl: string,
    requestId?: string
  ): Promise<string> {
    this.isGenerating = true;
    const currentRequestId =
      requestId || `meshy_img_${Date.now()}_${Math.random()}`;
    this.activeRequestId = currentRequestId;

    try {
      if (!imageUrl || imageUrl.trim() === "") {
        throw new Error("MeshyModelGen: Invalid image URL provided");
      }

      if (!this.meshyApi) {
        throw new Error("MeshyModelGen: API not initialized - check API key");
      }

      if (this.enableDebugLogging) {
        print(`MeshyModelGen: Generating image-to-3D from: ${imageUrl}`);
      }
      const result = await this.meshyApi.imageTo3DFull(imageUrl, {
        enablePbr: this.enablePbr,
        topology: this.topology as "quad" | "triangle",
        targetPolycount: this.targetPolycount,
        onProgress: (progress, status) => {
          this.notifyProgressCallbacks(
            currentRequestId,
            "image-to-3d",
            progress
          );
        },
      });

      if (!result.model_urls?.glb) {
        const errorMsg = "MeshyModelGen: No GLB URL in API response";
        throw new Error(errorMsg);
      }

      await this.loadGlbFromUrl(
        result.model_urls.glb,
        currentRequestId,
        true
      );

      const resultMsg = "Successfully created 3D model from image";

      if (this.enableDebugLogging) {
        print(`MeshyModelGen: ${resultMsg}`);
      }

      return resultMsg;
    } catch (error) {
      if (this.enableDebugLogging) {
        print(`MeshyModelGen: Image-to-3D error: ${error}`);
      }

      this.notifyFailureCallbacks(currentRequestId, error.toString());
      throw error;
    } finally {
      this.isGenerating = false;
      this.activeRequestId = null;
    }
  }

  /**
   * Generate 3D model from a base64-encoded image
   * Useful with Spectacles camera captures
   */
  public async generateModelFromBase64Image(
    base64Data: string,
    mimeType: string = "image/png",
    requestId?: string
  ): Promise<string> {
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    return this.generateModelFromImage(dataUri, requestId);
  }

  /**
   * Generate 3D model from a Lens Studio Texture (camera capture)
   * Encodes the texture to base64 and sends to Meshy image-to-3D
   */
  public async generateModelFromTexture(
    texture: Texture,
    requestId?: string
  ): Promise<string> {
    this.isGenerating = true;
    const currentRequestId =
      requestId || `meshy_tex_${Date.now()}_${Math.random()}`;
    this.activeRequestId = currentRequestId;

    try {
      return await new Promise<string>((resolve, reject) => {
        Base64.encodeTextureAsync(
          texture,
          (base64String) => {
            if (this.enableDebugLogging) {
              print("MeshyModelGen: Texture encoded, submitting to image-to-3D");
            }
            this.generateModelFromBase64Image(base64String, "image/png", currentRequestId)
              .then(resolve)
              .catch(reject);
          },
          () => {
            const error = "Failed to encode texture to base64";
            this.notifyFailureCallbacks(currentRequestId, error);
            reject(new Error(error));
          },
          CompressionQuality.HighQuality,
          EncodingType.Png
        );
      });
    } catch (error) {
      if (this.enableDebugLogging) {
        print(`MeshyModelGen: Texture-to-3D error: ${error}`);
      }
      throw error;
    } finally {
      this.isGenerating = false;
      this.activeRequestId = null;
    }
  }

  /**
   * Load a GLB model from URL and notify callbacks
   */
  private async loadGlbFromUrl(
    glbUrl: string,
    requestId: string,
    isFinal: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.enableDebugLogging) {
        print(`MeshyModelGen: Loading GLB from: ${glbUrl}`);
      }

      const resource = this.rsm.makeResourceFromUrl(glbUrl);

      this.rmm.loadResourceAsGltfAsset(
        resource,
        (gltfAsset: GltfAsset) => {
          if (this.enableDebugLogging) {
            print("MeshyModelGen: GLB loaded successfully");
          }

          this.notifyModelCallbacks(requestId, gltfAsset, isFinal);
          resolve();
        },
        (error: string) => {
          const errorMsg = "Failed to load GLB model: " + error;
          if (this.enableDebugLogging) {
            print(`MeshyModelGen: ${errorMsg}`);
          }
          reject(new Error(errorMsg));
        }
      );
    });
  }

  // --- Callback interface (matches ModelGen for compatibility) ---

  public setModelCallback(
    callbackId: string,
    callback: (model: GltfAsset, isFinal: boolean) => void
  ): void {
    this.modelCallbacks.set(callbackId, callback);
  }

  public setFailureCallback(
    callbackId: string,
    callback: (error: string) => void
  ): void {
    this.failureCallbacks.set(callbackId, callback);
  }

  public setProgressCallback(
    callbackId: string,
    callback: (stage: string, progress: number) => void
  ): void {
    this.progressCallbacks.set(callbackId, callback);
  }

  public removeCallbacks(callbackId: string): void {
    this.modelCallbacks.delete(callbackId);
    this.failureCallbacks.delete(callbackId);
    this.progressCallbacks.delete(callbackId);
  }

  private notifyModelCallbacks(
    requestId: string,
    model: GltfAsset,
    isFinal: boolean
  ): void {
    if (requestId && this.modelCallbacks.has(requestId)) {
      const callback = this.modelCallbacks.get(requestId);
      if (callback) callback(model, isFinal);
    } else {
      this.modelCallbacks.forEach((callback) => {
        if (callback) callback(model, isFinal);
      });
    }
  }

  private notifyFailureCallbacks(requestId: string, error: string): void {
    if (requestId && this.failureCallbacks.has(requestId)) {
      const callback = this.failureCallbacks.get(requestId);
      if (callback) callback(error);
    } else {
      this.failureCallbacks.forEach((callback) => {
        if (callback) callback(error);
      });
    }
  }

  private notifyProgressCallbacks(
    requestId: string,
    stage: string,
    progress: number
  ): void {
    if (requestId && this.progressCallbacks.has(requestId)) {
      const callback = this.progressCallbacks.get(requestId);
      if (callback) callback(stage, progress);
    } else {
      this.progressCallbacks.forEach((callback) => {
        if (callback) callback(stage, progress);
      });
    }
  }

  // --- Convenience methods matching ModelGen ---

  public async generateModelAtTarget(
    prompt: string,
    requestId?: string
  ): Promise<string> {
    return this.generateModel(prompt, undefined, requestId);
  }

  public async generateModelAtPosition(
    prompt: string,
    position: vec3,
    requestId?: string
  ): Promise<string> {
    return this.generateModel(prompt, position, requestId);
  }

  public isGeneratingModel(): boolean {
    return this.isGenerating;
  }

  public getTargetPosition(): vec3 | null {
    if (this.targetPosition) {
      return this.targetPosition.getTransform().getWorldPosition();
    }
    return null;
  }

  public setTargetPosition(newTarget: SceneObject): void {
    this.targetPosition = newTarget;
  }

  public setGenerationSettings(
    refineMesh: boolean,
    enablePbr: boolean
  ): void {
    this.refineMesh = refineMesh;
    this.enablePbr = enablePbr;
  }

  public getGenerationSettings(): {
    refineMesh: boolean;
    enablePbr: boolean;
    topology: string;
    targetPolycount: number;
  } {
    return {
      refineMesh: this.refineMesh,
      enablePbr: this.enablePbr,
      topology: this.topology,
      targetPolycount: this.targetPolycount,
    };
  }
}
