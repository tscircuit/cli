/**
 * Camera presets for 3D snapshot rendering.
 *
 * Each preset is a function that takes the default camera result from
 * `getBestCameraPosition` and returns modified camera options for
 * the desired viewpoint.
 *
 * Coordinate system (GLTF / circuit-json-to-gltf):
 *   Y = up (perpendicular to PCB)
 *   X, Z = PCB plane
 *   camPos/lookAt use negated X (camPos = [-camX, camY, camZ])
 */

type CameraResult = {
  camPos: readonly [number, number, number]
  lookAt: readonly [number, number, number]
  fov: number
}

function distance(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

/**
 * Place camera along a unit direction from lookAt at the same distance
 * as the default camera.
 */
function repositionCamera(
  cam: CameraResult,
  dir: [number, number, number],
): CameraResult {
  const dist = distance(cam.camPos, cam.lookAt)
  const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2)
  const nx = dir[0] / len
  const ny = dir[1] / len
  const nz = dir[2] / len
  return {
    camPos: [
      cam.lookAt[0] + nx * dist,
      cam.lookAt[1] + ny * dist,
      cam.lookAt[2] + nz * dist,
    ] as const,
    lookAt: cam.lookAt,
    fov: cam.fov,
  }
}

export const CAMERA_PRESETS = {
  /** Directly above the board looking straight down */
  "top-down": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [0.0001, 1, -0.01]),

  /** Angled view from top-left corner */
  "top-left-corner": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [0.7, 1.2, -0.8]),

  /** From the left side, angled from above */
  "top-left": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [1, 1.2, 0]),

  /** Angled view from top-right corner */
  "top-right-corner": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [-0.7, 1.2, -0.8]),

  /** From the right side, angled from above */
  "top-right": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [-1, 1.2, 0]),

  /** Side view from the left (eye level) */
  "left-sideview": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [1, 0.05, 0]),

  /** Side view from the right (eye level) */
  "right-sideview": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [-1, 0.05, 0]),

  /** Front view (eye level) */
  front: (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [0, 0.05, -1]),

  /** Top-center with a moderate angle (the default 3D view) */
  "top-center-angled": (cam: CameraResult): CameraResult =>
    repositionCamera(cam, [0, 1, -1]),
} as const satisfies Record<string, (cam: CameraResult) => CameraResult>

export type CameraPreset = keyof typeof CAMERA_PRESETS

export const CAMERA_PRESET_NAMES = Object.keys(CAMERA_PRESETS) as CameraPreset[]

/**
 * Apply a camera preset to a default camera result from getBestCameraPosition.
 * Throws if the preset is unknown.
 */
export function applyCameraPreset(
  preset: string,
  cam: CameraResult,
): CameraResult {
  if (!(preset in CAMERA_PRESETS)) {
    throw new Error(
      `Unknown camera preset "${preset}". Valid presets: ${CAMERA_PRESET_NAMES.join(", ")}`,
    )
  }
  return CAMERA_PRESETS[preset as CameraPreset](cam)
}
