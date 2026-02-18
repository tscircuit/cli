import type { CircuitJson, PcbPanel, PcbBoard } from "circuit-json"

/**
 * Calculate optimal camera position for PCB viewing based on circuit dimensions
 */
export function getBestCameraPosition(circuitJson: CircuitJson): {
  camPos: readonly [number, number, number]
  lookAt: readonly [number, number, number]
} {
  // Find panel or board to get dimensions (panel takes priority)
  const panel = circuitJson.find((item) => item.type === "pcb_panel") as
    | PcbPanel
    | undefined
  const board = circuitJson.find((item) => item.type === "pcb_board") as
    | PcbBoard
    | undefined

  const surface = panel || board

  if (!surface) {
    // Default fallback for circuits without explicit board or panel
    return {
      camPos: [30, 30, 25] as const,
      lookAt: [0, 0, 0] as const,
    }
  }

  const { width, height, center } = surface

  // Validate required properties
  if (!width || !height || !center) {
    return {
      camPos: [30, 30, 25] as const,
      lookAt: [0, 0, 0] as const,
    }
  }

  // Calculate camera distance based on board size
  const maxDimension = Math.max(width, height)

  // Use completely deterministic integer values to ensure identical rendering
  // across all environments (local, CI, different Node versions, etc.)
  const baseDistance = Math.round(maxDimension * 0.8)

  // Force integer camera positions for absolute consistency
  // Position camera relative to board center (board center in 2D maps to (center.x, 0, center.y) in 3D)
  const camX = Math.round(center.x + baseDistance * 0.7)
  const camY = Math.round(baseDistance * 1.2)
  const camZ = Math.round(center.y + baseDistance * 0.8)

  // lookAt the board center in 3D space
  // Board 2D (center.x, center.y) maps to 3D (center.x, 0, center.y)
  const lookAtX = Math.round(center.x)
  const lookAtZ = Math.round(center.y)

  return {
    camPos: [camX, camY, camZ] as const,
    lookAt: [lookAtX, 0, lookAtZ] as const,
  }
}
