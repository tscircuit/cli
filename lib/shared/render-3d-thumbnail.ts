import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonTo3dGlb,
  getDefaultCameraForCircuitJson,
} from "circuit-json-to-3d-png"
import { renderGLTFToPNGFromGLB } from "poppygl"

export const render3dThumbnail = async (
  circuitJson: AnyCircuitElement[],
): Promise<Uint8Array> => {
  const [glb, camera] = await Promise.all([
    convertCircuitJsonTo3dGlb(circuitJson),
    getDefaultCameraForCircuitJson(circuitJson),
  ])

  // The wrapper's PNG renderer does not forward the realistic option.
  return renderGLTFToPNGFromGLB(glb, {
    ...camera,
    width: 480,
    height: 320,
    supersampling: 2,
    realistic: true,
  })
}
