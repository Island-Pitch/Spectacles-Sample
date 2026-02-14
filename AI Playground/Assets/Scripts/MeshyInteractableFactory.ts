import { MeshyModelGen } from "./MeshyModelGen";
import { Snap3DInteractable } from "./Snap3DInteractable";

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider";

/**
 * MeshyInteractableFactory - Creates interactable 3D objects using Meshy.ai
 *
 * Extends the Snap3DInteractableFactory pattern with Meshy.ai capabilities:
 * - Text-to-3D: generate models from text descriptions
 * - Image-to-3D: generate models from images/photos
 * - Camera-to-3D: capture what the user sees and generate a 3D model of it
 *
 * Uses the same Snap3DInteractable prefab system for AR display,
 * so generated models are immediately interactive in the scene.
 */
@component
export class MeshyInteractableFactory extends BaseScriptComponent {

  @ui.separator
  @ui.group_start("Text-to-3D Test")
  @input
  @widget(new TextAreaWidget())
  private textPrompt: string = "A cute robot character";
  @input
  private runTextTo3DOnTap: boolean = false;
  @ui.group_end

  @ui.separator
  @ui.group_start("Image-to-3D Test")
  @input
  @hint("URL of image to convert to 3D")
  private imageUrl: string = "";
  @input
  private runImageTo3DOnTap: boolean = false;
  @ui.group_end

  @input
  snap3DInteractablePrefab: ObjectPrefab;

  @input
  @allowUndefined
  @hint("MeshyModelGen component reference (auto-created if not set)")
  private meshyModelGen: MeshyModelGen;

  private availableToRequest: boolean = true;
  private wcfmp = WorldCameraFinderProvider.getInstance();

  onAwake() {
    this.createEvent("TapEvent").bind(() => {
      if (this.runTextTo3DOnTap && this.availableToRequest) {
        this.createTextTo3DInteractable(this.textPrompt);
      } else if (this.runImageTo3DOnTap && this.imageUrl && this.availableToRequest) {
        this.createImageTo3DInteractable(this.imageUrl);
      }
    });

    if (!this.meshyModelGen) {
      print(
        "MeshyInteractableFactory: No MeshyModelGen assigned - assign one in the inspector"
      );
    }
  }

  /**
   * Create an interactable 3D object from a text prompt using Meshy.ai
   */
  createTextTo3DInteractable(
    prompt: string,
    overridePosition?: vec3
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.availableToRequest) {
        print("MeshyInteractableFactory: Already processing a request");
        reject("Already processing");
        return;
      }

      if (!this.meshyModelGen) {
        reject("MeshyModelGen not configured");
        return;
      }

      this.availableToRequest = false;

      // Create the interactable prefab
      let outputObj = this.snap3DInteractablePrefab.instantiate(
        this.sceneObject
      );
      outputObj.name = "MeshyInteractable - " + prompt;

      let interactable = outputObj.getComponent(
        Snap3DInteractable.getTypeName()
      );
      interactable.setPrompt(prompt);

      // Position it
      if (overridePosition) {
        outputObj.getTransform().setWorldPosition(overridePosition);
      } else {
        let newPos = this.wcfmp.getForwardPosition(80);
        outputObj.getTransform().setWorldPosition(newPos);
      }

      // Set up callbacks for this specific request
      const requestId = `meshy_text_${Date.now()}`;

      this.meshyModelGen.setModelCallback(
        requestId,
        (model: GltfAsset, isFinal: boolean) => {
          interactable.setModel(model, isFinal);
          if (isFinal) {
            this.meshyModelGen.removeCallbacks(requestId);
            this.availableToRequest = true;
            resolve("Successfully created mesh with prompt: " + prompt);
          }
        }
      );

      this.meshyModelGen.setFailureCallback(requestId, (error: string) => {
        interactable.onFailure(error);
        this.meshyModelGen.removeCallbacks(requestId);
        this.availableToRequest = true;
        reject("Failed to create mesh: " + error);
      });

      this.meshyModelGen.setProgressCallback(
        requestId,
        (stage: string, progress: number) => {
          interactable.setPrompt(`${prompt}\n[${stage}] ${progress}%`);
        }
      );

      // Kick off generation
      this.meshyModelGen
        .generateModel(prompt, overridePosition, requestId)
        .catch((error) => {
          // Error already handled via failure callback
          print(`MeshyInteractableFactory: Generation error: ${error}`);
        });
    });
  }

  /**
   * Create an interactable 3D object from an image URL using Meshy.ai
   * This is a capability not available with Snap3D.
   */
  createImageTo3DInteractable(
    imageUrl: string,
    overridePosition?: vec3
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.availableToRequest) {
        print("MeshyInteractableFactory: Already processing a request");
        reject("Already processing");
        return;
      }

      if (!this.meshyModelGen) {
        reject("MeshyModelGen not configured");
        return;
      }

      this.availableToRequest = false;

      // Create the interactable prefab
      let outputObj = this.snap3DInteractablePrefab.instantiate(
        this.sceneObject
      );
      outputObj.name = "MeshyInteractable - Image-to-3D";

      let interactable = outputObj.getComponent(
        Snap3DInteractable.getTypeName()
      );
      interactable.setPrompt("Generating 3D from image...");

      // Position it
      if (overridePosition) {
        outputObj.getTransform().setWorldPosition(overridePosition);
      } else {
        let newPos = this.wcfmp.getForwardPosition(80);
        outputObj.getTransform().setWorldPosition(newPos);
      }

      const requestId = `meshy_img_${Date.now()}`;

      this.meshyModelGen.setModelCallback(
        requestId,
        (model: GltfAsset, isFinal: boolean) => {
          interactable.setModel(model, isFinal);
          if (isFinal) {
            this.meshyModelGen.removeCallbacks(requestId);
            this.availableToRequest = true;
            resolve("Successfully created 3D model from image");
          }
        }
      );

      this.meshyModelGen.setFailureCallback(requestId, (error: string) => {
        interactable.onFailure(error);
        this.meshyModelGen.removeCallbacks(requestId);
        this.availableToRequest = true;
        reject("Failed to create 3D from image: " + error);
      });

      this.meshyModelGen.setProgressCallback(
        requestId,
        (stage: string, progress: number) => {
          interactable.setPrompt(`Image-to-3D\n[${stage}] ${progress}%`);
        }
      );

      this.meshyModelGen
        .generateModelFromImage(imageUrl, requestId)
        .catch((error) => {
          print(`MeshyInteractableFactory: Image-to-3D error: ${error}`);
        });
    });
  }

  /**
   * Create an interactable 3D object from a camera-captured texture.
   * Point Spectacles at something, capture it, and generate a 3D version.
   */
  createCameraTo3DInteractable(
    texture: Texture,
    overridePosition?: vec3
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.availableToRequest) {
        print("MeshyInteractableFactory: Already processing a request");
        reject("Already processing");
        return;
      }

      if (!this.meshyModelGen) {
        reject("MeshyModelGen not configured");
        return;
      }

      this.availableToRequest = false;

      let outputObj = this.snap3DInteractablePrefab.instantiate(
        this.sceneObject
      );
      outputObj.name = "MeshyInteractable - Camera-to-3D";

      let interactable = outputObj.getComponent(
        Snap3DInteractable.getTypeName()
      );
      interactable.setPrompt("Generating 3D from camera...");

      if (overridePosition) {
        outputObj.getTransform().setWorldPosition(overridePosition);
      } else {
        let newPos = this.wcfmp.getForwardPosition(80);
        outputObj.getTransform().setWorldPosition(newPos);
      }

      const requestId = `meshy_cam_${Date.now()}`;

      this.meshyModelGen.setModelCallback(
        requestId,
        (model: GltfAsset, isFinal: boolean) => {
          interactable.setModel(model, isFinal);
          if (isFinal) {
            this.meshyModelGen.removeCallbacks(requestId);
            this.availableToRequest = true;
            resolve("Successfully created 3D model from camera");
          }
        }
      );

      this.meshyModelGen.setFailureCallback(requestId, (error: string) => {
        interactable.onFailure(error);
        this.meshyModelGen.removeCallbacks(requestId);
        this.availableToRequest = true;
        reject("Failed to create 3D from camera: " + error);
      });

      this.meshyModelGen.setProgressCallback(
        requestId,
        (stage: string, progress: number) => {
          interactable.setPrompt(`Camera-to-3D\n[${stage}] ${progress}%`);
        }
      );

      this.meshyModelGen
        .generateModelFromTexture(texture, requestId)
        .catch((error) => {
          print(`MeshyInteractableFactory: Camera-to-3D error: ${error}`);
        });
    });
  }

  /**
   * Check if factory is ready for a new request
   */
  isAvailable(): boolean {
    return this.availableToRequest;
  }
}
