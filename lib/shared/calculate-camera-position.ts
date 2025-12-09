/**
 * Calculate optimal camera position for 3D circuit board rendering
 * based on circuit JSON dimensions and component positions.
 */
import type { AnyCircuitElement } from "circuit-json"

export interface CameraPosition {
  camPos: [number, number, number]
  lookAt: [number, number, number]
}

// Multiplier keeps the camera far enough back to frame large boards
const CAMERA_DISTANCE_MULTIPLIER = 1.2
// Ratio offsets the camera for a subtle isometric viewing angle
const CAMERA_OFFSET_RATIO = 0.7
// Fallback ensures we do not pull the camera too close for tiny circuits
const MIN_EFFECTIVE_DIMENSION = 1

const parseDimension = (value?: string | number): number | undefined => {
  if (value === undefined) return undefined
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^[+-]?\d+\.?\d*/)
    if (!match) {
      return undefined
    }
    const parsed = Number(match[0])
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function calculateCameraPosition(
  circuitJson: AnyCircuitElement[],
): CameraPosition {
  const defaultResult: CameraPosition = {
    camPos: [10, 10, 10],
    lookAt: [0, 0, 0],
  }

  if (!Array.isArray(circuitJson) || circuitJson.length === 0) {
    return defaultResult
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let boardWidth: number | null = null
  let boardHeight: number | null = null
  let centerX = 0
  let centerY = 0

  for (const item of circuitJson) {
    if (item.type === "pcb_board") {
      const maybeBoardWidth = parseDimension(
        item.width as string | number | undefined,
      )
      const maybeBoardHeight = parseDimension(
        item.height as string | number | undefined,
      )
      if (maybeBoardWidth !== undefined) {
        boardWidth = maybeBoardWidth
      }
      if (maybeBoardHeight !== undefined) {
        boardHeight = maybeBoardHeight
      }
      if (item.center) {
        centerX = item.center.x
        centerY = item.center.y
      }
    }

    if (item.type === "pcb_component" && item.center) {
      const x = item.center.x ?? 0
      const y = item.center.y ?? 0

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      const compWidth = parseDimension(
        item.width as string | number | undefined,
      )
      if (compWidth !== undefined) {
        minX = Math.min(minX, x - compWidth / 2)
        maxX = Math.max(maxX, x + compWidth / 2)
      }
      const compHeight = parseDimension(
        item.height as string | number | undefined,
      )
      if (compHeight !== undefined) {
        minY = Math.min(minY, y - compHeight / 2)
        maxY = Math.max(maxY, y + compHeight / 2)
      }
    }
  }

  let effectiveMinX = 0
  let effectiveMaxX = 0
  let effectiveMinY = 0
  let effectiveMaxY = 0

  if (boardWidth !== null && boardHeight !== null) {
    effectiveMinX = centerX - boardWidth / 2
    effectiveMaxX = centerX + boardWidth / 2
    effectiveMinY = centerY - boardHeight / 2
    effectiveMaxY = centerY + boardHeight / 2

    // If any components exist, expand bounds to include them
    if (minX !== Infinity) {
      effectiveMinX = Math.min(effectiveMinX, minX)
      effectiveMaxX = Math.max(effectiveMaxX, maxX)
      effectiveMinY = Math.min(effectiveMinY, minY)
      effectiveMaxY = Math.max(effectiveMaxY, maxY)
    }
  } else if (minX !== Infinity) {
    effectiveMinX = minX
    effectiveMaxX = maxX
    effectiveMinY = minY
    effectiveMaxY = maxY
    centerX = (minX + maxX) / 2
    centerY = (minY + maxY) / 2
  } else {
    return defaultResult
  }

  const width = effectiveMaxX - effectiveMinX
  const height = effectiveMaxY - effectiveMinY
  const maxDimension = Math.max(width, height)
  const effectiveDimension = Math.max(maxDimension, MIN_EFFECTIVE_DIMENSION)
  const cameraDistance = effectiveDimension * CAMERA_DISTANCE_MULTIPLIER

  const camPos: [number, number, number] = [
    centerX + cameraDistance * CAMERA_OFFSET_RATIO,
    centerY + cameraDistance * CAMERA_OFFSET_RATIO,
    cameraDistance * CAMERA_OFFSET_RATIO,
  ]

  const lookAt: [number, number, number] = [centerX, centerY, 0]

  return { camPos, lookAt }
}
