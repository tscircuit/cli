import type { AnyCircuitElement } from "circuit-json"

interface Pad {
  portHint?: string
  x: number
  y: number
}

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

const normalizePortHint = (value: unknown) => {
  const hint = String(value ?? "").trim()
  const numericMatch = hint.match(/^(?:pin)?(\d+)$/i)
  return numericMatch ? `pin${numericMatch[1]}` : hint
}

const extractPads = (circuitJson: readonly AnyCircuitElement[]): Pad[] =>
  circuitJson.flatMap((rawElement): Pad[] => {
    const element = rawElement as AnyCircuitElement & Record<string, unknown>
    if (element.type !== "pcb_smtpad" && element.type !== "pcb_plated_hole") {
      return []
    }

    const portHints = Array.isArray(element.port_hints)
      ? element.port_hints
      : []
    return [
      {
        portHint: portHints[0] ? normalizePortHint(portHints[0]) : undefined,
        x: toNumber(element.x),
        y: toNumber(element.y),
      },
    ]
  })

const centerPads = (pads: Pad[]) => {
  const minX = Math.min(...pads.map((pad) => pad.x))
  const maxX = Math.max(...pads.map((pad) => pad.x))
  const minY = Math.min(...pads.map((pad) => pad.y))
  const maxY = Math.max(...pads.map((pad) => pad.y))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return pads.map((pad) => ({
    ...pad,
    x: pad.x - centerX,
    y: pad.y - centerY,
  }))
}

export const getFootprinterToTargetPinMap = (
  targetCircuitJson: readonly AnyCircuitElement[],
  footprinterCircuitJson: readonly AnyCircuitElement[],
) => {
  const targetPads = centerPads(extractPads(targetCircuitJson))
  const footprinterPads = centerPads(extractPads(footprinterCircuitJson))
  if (targetPads.length !== footprinterPads.length) return null

  const availableTargetIndexes = new Set(targetPads.map((_, index) => index))
  const pinMap = new Map<string, string>()
  const mappedTargetHints = new Set<string>()

  for (const footprinterPad of footprinterPads) {
    let nearestTargetIndex = -1
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const targetIndex of availableTargetIndexes) {
      const targetPad = targetPads[targetIndex]
      const distance = Math.hypot(
        footprinterPad.x - targetPad.x,
        footprinterPad.y - targetPad.y,
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestTargetIndex = targetIndex
      }
    }

    if (nearestTargetIndex === -1) return null
    availableTargetIndexes.delete(nearestTargetIndex)
    const targetPad = targetPads[nearestTargetIndex]
    if (!footprinterPad.portHint || !targetPad.portHint) continue

    const existingTargetHint = pinMap.get(footprinterPad.portHint)
    if (existingTargetHint && existingTargetHint !== targetPad.portHint) {
      return null
    }

    pinMap.set(footprinterPad.portHint, targetPad.portHint)
    mappedTargetHints.add(targetPad.portHint)
  }

  const targetHints = new Set(
    targetPads.flatMap((pad) => (pad.portHint ? [pad.portHint] : [])),
  )
  if (
    [...targetHints].some((targetHint) => !mappedTargetHints.has(targetHint))
  ) {
    return null
  }

  return pinMap
}
