import { fp } from "@tscircuit/footprinter"
import type { AnyCircuitElement } from "circuit-json"
import {
  circuitJsonToFootprinter,
  type FootprinterDiscoveryCandidate,
} from "circuit-json-to-footprinter"

export const DEFAULT_FOOTPRINTER_ACCURACY_THRESHOLD = 0.98

interface Pad {
  portHint?: string
  x: number
  y: number
}

export interface ImportedFootprintConversion {
  accuracy?: number
  candidate?: FootprinterDiscoveryCandidate
  mode: "exact-discovery-failed" | "exact-low-accuracy" | "footprinter"
  tsx: string
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined

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

const getFootprinterToTargetPinMap = (
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

const replaceExactFootprint = (
  tsx: string,
  footprinterString: string,
  pinMap: Map<string, string>,
) => {
  const exactFootprintPattern = /footprint=\{<footprint>[\s\S]*?<\/footprint>\}/
  if (!exactFootprintPattern.test(tsx)) {
    throw new Error("Could not find the generated exact footprint in TSX")
  }

  let compactTsx = tsx.replace(
    exactFootprintPattern,
    `footprint=${JSON.stringify(footprinterString)}`,
  )
  const hasRemappedPins = [...pinMap].some(
    ([footprinterHint, targetHint]) => footprinterHint !== targetHint,
  )
  if (!hasRemappedPins) return compactTsx

  const remappedPins = [...pinMap].filter(
    ([footprinterHint, targetHint]) => footprinterHint !== targetHint,
  )
  const mappingLines = remappedPins
    .map(
      ([footprinterHint, targetHint]) =>
        `  ${JSON.stringify(targetHint)}: [...pinLabels[${JSON.stringify(
          targetHint,
        )}], ${JSON.stringify(footprinterHint)}],`,
    )
    .join("\n")
  const remappedPinLabels = [
    "const footprinterPinLabels = {",
    "  ...pinLabels,",
    mappingLines,
    "} as const",
    "",
  ].join("\n")
  const exportIndex = compactTsx.indexOf("export const ")
  if (exportIndex === -1 || !compactTsx.includes("pinLabels={pinLabels}")) {
    throw new Error("Could not remap generated TSX pin labels")
  }

  compactTsx =
    compactTsx.slice(0, exportIndex) +
    remappedPinLabels +
    "\n" +
    compactTsx.slice(exportIndex)
  return compactTsx.replace(
    "pinLabels={pinLabels}",
    "pinLabels={footprinterPinLabels}",
  )
}

export const getEasyEdaFootprinterSourceHints = (rawEasy: unknown) => {
  const component = asRecord(rawEasy)
  const dataStr = asRecord(component?.dataStr)
  const head = asRecord(dataStr?.head)
  const componentParameters = asRecord(head?.c_para)
  const packageDetail = asRecord(component?.packageDetail)
  const packageDataStr = asRecord(packageDetail?.dataStr)
  const packageHead = asRecord(packageDataStr?.head)
  const packageParameters = asRecord(packageHead?.c_para)
  const values = [
    component?.title,
    component?.description,
    componentParameters?.package,
    componentParameters?.pre,
    packageDetail?.title,
    packageParameters?.package,
    packageParameters?.pre,
  ]

  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]
}

export const convertImportedFootprintToFootprinter = ({
  circuitJson,
  sourceHints,
  tsx,
}: {
  circuitJson: readonly AnyCircuitElement[]
  sourceHints?: string[]
  tsx: string
}): ImportedFootprintConversion => {
  try {
    const discovery = circuitJsonToFootprinter(circuitJson, {
      maxCandidates: 5,
      sourceHints,
    })
    const candidate = discovery.best
    if (
      !candidate ||
      candidate.copperIntersectionOverUnion <=
        DEFAULT_FOOTPRINTER_ACCURACY_THRESHOLD
    ) {
      return {
        accuracy: candidate?.copperIntersectionOverUnion,
        candidate: candidate ?? undefined,
        mode: "exact-low-accuracy",
        tsx,
      }
    }

    const footprinterCircuitJson = fp
      .string(candidate.footprinterString)
      .circuitJson() as AnyCircuitElement[]
    const pinMap = getFootprinterToTargetPinMap(
      circuitJson,
      footprinterCircuitJson,
    )
    if (!pinMap) {
      return {
        accuracy: candidate.copperIntersectionOverUnion,
        candidate,
        mode: "exact-discovery-failed",
        tsx,
      }
    }

    return {
      accuracy: candidate.copperIntersectionOverUnion,
      candidate,
      mode: "footprinter",
      tsx: replaceExactFootprint(tsx, candidate.footprinterString, pinMap),
    }
  } catch {
    return {
      mode: "exact-discovery-failed",
      tsx,
    }
  }
}
