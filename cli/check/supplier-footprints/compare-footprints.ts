import {
  circuitJsonToFootprint,
  type Footprint,
  type PinMismatchDetail,
  summarizeCopperComparison,
} from "circuit-json-to-footprinter"
import type {
  AnyCircuitElement,
  PcbComponent,
  PcbHole,
  PcbPlatedHole,
  PcbPort,
  PcbSmtPad,
  SourcePort,
} from "circuit-json"

type PcbPad = PcbSmtPad | PcbPlatedHole

export type SupplierFootprintMismatch = {
  message: string
}

export type SupplierFootprintComparison = {
  matches: boolean
  localPrimitiveCount: number
  supplierPrimitiveCount: number
  mismatches: SupplierFootprintMismatch[]
}

const MINIMUM_INTERSECTION_OVER_UNION = 0.9999

const isPcbPad = (element: AnyCircuitElement): element is PcbPad =>
  element.type === "pcb_smtpad" || element.type === "pcb_plated_hole"

const isPcbHole = (element: AnyCircuitElement): element is PcbHole =>
  element.type === "pcb_hole"

const getPcbComponent = ({
  circuitJson,
  pcbComponentId,
}: {
  circuitJson: AnyCircuitElement[]
  pcbComponentId?: string
}) =>
  circuitJson.find(
    (element): element is PcbComponent =>
      element.type === "pcb_component" &&
      (pcbComponentId === undefined ||
        element.pcb_component_id === pcbComponentId),
  )

const getPinNumber = ({
  circuitJson,
  pad,
}: {
  circuitJson: AnyCircuitElement[]
  pad: PcbPad
}) => {
  if (!pad.pcb_port_id) return undefined

  const pcbPort = circuitJson.find(
    (element): element is PcbPort =>
      element.type === "pcb_port" && element.pcb_port_id === pad.pcb_port_id,
  )
  if (!pcbPort?.source_port_id) return undefined

  const sourcePort = circuitJson.find(
    (element): element is SourcePort =>
      element.type === "source_port" &&
      element.source_port_id === pcbPort.source_port_id,
  )
  return sourcePort?.pin_number
}

const hasNumericPinHint = (hint: string) => /^(?:pin)?\d+$/i.test(hint.trim())

const addCircuitJsonGeometryDefaults = (pad: PcbPad): PcbPad => {
  if (
    pad.type === "pcb_smtpad" &&
    (pad.shape === "rotated_rect" || pad.shape === "rotated_pill")
  ) {
    return { ...pad, ccw_rotation: pad.ccw_rotation ?? 0 }
  }
  if (pad.type !== "pcb_plated_hole") return pad

  if (pad.shape === "oval" || pad.shape === "pill") {
    return { ...pad, ccw_rotation: pad.ccw_rotation ?? 0 }
  }
  if (pad.shape === "circular_hole_with_rect_pad") {
    return {
      ...pad,
      hole_offset_x: pad.hole_offset_x ?? 0,
      hole_offset_y: pad.hole_offset_y ?? 0,
      rect_ccw_rotation: pad.rect_ccw_rotation ?? 0,
    }
  }
  if (pad.shape === "pill_hole_with_rect_pad") {
    return {
      ...pad,
      hole_offset_x: pad.hole_offset_x ?? 0,
      hole_offset_y: pad.hole_offset_y ?? 0,
    }
  }
  if (pad.shape === "rotated_pill_hole_with_rect_pad") {
    return {
      ...pad,
      hole_offset_x: pad.hole_offset_x ?? 0,
      hole_offset_y: pad.hole_offset_y ?? 0,
      hole_ccw_rotation: pad.hole_ccw_rotation ?? 0,
      rect_ccw_rotation: pad.rect_ccw_rotation ?? 0,
    }
  }
  if (pad.shape === "hole_with_polygon_pad") {
    return {
      ...pad,
      hole_offset_x: pad.hole_offset_x ?? 0,
      hole_offset_y: pad.hole_offset_y ?? 0,
      ccw_rotation: pad.ccw_rotation ?? 0,
    }
  }
  return pad
}

const addResolvedPinHint = ({
  circuitJson,
  pad,
}: {
  circuitJson: AnyCircuitElement[]
  pad: PcbPad
}): PcbPad => {
  const pinNumber = getPinNumber({ circuitJson, pad })
  if (pinNumber === undefined) return pad

  return {
    ...pad,
    port_hints: [
      ...(pad.port_hints ?? []).filter((hint) => !hasNumericPinHint(hint)),
      `pin${pinNumber}`,
    ],
  }
}

const getComponentFootprint = ({
  circuitJson,
  pcbComponent,
}: {
  circuitJson: AnyCircuitElement[]
  pcbComponent: PcbComponent
}) => {
  const fabricationPrimitives: AnyCircuitElement[] = []
  for (const element of circuitJson) {
    if (
      isPcbPad(element) &&
      element.pcb_component_id === pcbComponent.pcb_component_id
    ) {
      const pad = addCircuitJsonGeometryDefaults(element)
      fabricationPrimitives.push(addResolvedPinHint({ circuitJson, pad }))
      continue
    }
    if (
      isPcbHole(element) &&
      element.pcb_component_id === pcbComponent.pcb_component_id
    ) {
      fabricationPrimitives.push(element)
    }
  }

  return circuitJsonToFootprint(fabricationPrimitives)
}

const mirrorPcbSmtPad = (pad: PcbSmtPad): PcbSmtPad => {
  const layer =
    pad.layer === "top" ? "bottom" : pad.layer === "bottom" ? "top" : pad.layer
  if (pad.shape === "polygon") {
    return {
      ...pad,
      layer,
      points: pad.points.map((point) => ({ ...point, y: -point.y })),
    }
  }
  if (pad.shape === "rotated_rect" || pad.shape === "rotated_pill") {
    return {
      ...pad,
      layer,
      y: -pad.y,
      ccw_rotation: -pad.ccw_rotation,
    }
  }
  return { ...pad, layer, y: -pad.y }
}

const mirrorPcbPlatedHole = (pad: PcbPlatedHole): PcbPlatedHole => {
  const layers = pad.layers.map((layer) =>
    layer === "top" ? "bottom" : layer === "bottom" ? "top" : layer,
  )
  if (pad.shape === "oval" || pad.shape === "pill") {
    return {
      ...pad,
      layers,
      y: -pad.y,
      ccw_rotation: -pad.ccw_rotation,
    }
  }
  if (pad.shape === "circular_hole_with_rect_pad") {
    return {
      ...pad,
      layers,
      y: -pad.y,
      hole_offset_y: -pad.hole_offset_y,
      rect_ccw_rotation:
        pad.rect_ccw_rotation === undefined
          ? undefined
          : -pad.rect_ccw_rotation,
    }
  }
  if (pad.shape === "pill_hole_with_rect_pad") {
    return {
      ...pad,
      layers,
      y: -pad.y,
      hole_offset_y: -pad.hole_offset_y,
    }
  }
  if (pad.shape === "rotated_pill_hole_with_rect_pad") {
    return {
      ...pad,
      layers,
      y: -pad.y,
      hole_offset_y: -pad.hole_offset_y,
      hole_ccw_rotation: -pad.hole_ccw_rotation,
      rect_ccw_rotation: -pad.rect_ccw_rotation,
    }
  }
  if (pad.shape === "hole_with_polygon_pad") {
    return {
      ...pad,
      layers,
      y: -pad.y,
      hole_offset_y: -pad.hole_offset_y,
      pad_outline: pad.pad_outline.map((point) => ({
        ...point,
        y: -point.y,
      })),
      ccw_rotation:
        pad.ccw_rotation === undefined ? undefined : -pad.ccw_rotation,
    }
  }
  return { ...pad, layers, y: -pad.y }
}

const mirrorPcbHole = (hole: PcbHole): PcbHole =>
  hole.hole_shape === "rotated_pill"
    ? { ...hole, y: -hole.y, ccw_rotation: -hole.ccw_rotation }
    : { ...hole, y: -hole.y }

const mirrorFootprint = (footprint: Footprint): Footprint => ({
  ...footprint,
  courtyard: footprint.courtyard
    ? {
        ...footprint.courtyard,
        center: {
          ...footprint.courtyard.center,
          y: -footprint.courtyard.center.y,
        },
      }
    : undefined,
  holes: footprint.holes.map(mirrorPcbHole),
  pads: footprint.pads.map((pad) =>
    pad.type === "pcb_smtpad" ? mirrorPcbSmtPad(pad) : mirrorPcbPlatedHole(pad),
  ),
  vias: footprint.vias.map((via) => ({ ...via, y: -via.y })),
  y: -(footprint.y ?? 0),
})

const alignSupplierFootprint = ({
  localPcbComponent,
  supplierFootprint,
  supplierPcbComponent,
}: {
  localPcbComponent: PcbComponent
  supplierFootprint: Footprint
  supplierPcbComponent: PcbComponent
}) => {
  const layersDiffer = localPcbComponent.layer !== supplierPcbComponent.layer
  const alignedFootprint = layersDiffer
    ? mirrorFootprint(supplierFootprint)
    : supplierFootprint

  return {
    ...alignedFootprint,
    rotation: layersDiffer
      ? localPcbComponent.rotation + supplierPcbComponent.rotation
      : localPcbComponent.rotation - supplierPcbComponent.rotation,
  }
}

const getPrimitiveCount = (footprint: Footprint) =>
  footprint.pads.length + footprint.holes.length

const formatPercentage = (ratio: number) => `${(ratio * 100).toFixed(4)}%`

const formatPinMismatch = (mismatch: PinMismatchDetail) => {
  const localPins = mismatch.leftPinNumbers.join(", ") || "none"
  const supplierPins = mismatch.rightPinNumbers.join(", ") || "none"
  const localPad = mismatch.leftPadIndex ?? "missing"
  const supplierPad = mismatch.rightPadIndex ?? "missing"
  return `pin ${localPins} mismatch at local pad ${localPad}: supplier pad ${supplierPad} has pin ${supplierPins}`
}

const getNumericPinHints = (pad: PcbPad) =>
  (pad.port_hints ?? [])
    .flatMap((hint) => {
      const match = /^(?:pin)?(\d+)$/i.exec(hint.trim())
      return match?.[1] ? [Number.parseInt(match[1], 10)] : []
    })
    .sort((firstPin, secondPin) => firstPin - secondPin)

const getSmtPadLayerSignature = (pad: PcbSmtPad) => {
  const pinLabel = getNumericPinHints(pad).join(",") || "unnumbered"
  return `${pinLabel}:${pad.layer}`
}

const getSmtPadLayerSignatures = (footprint: Footprint) =>
  footprint.pads
    .filter((pad): pad is PcbSmtPad => pad.type === "pcb_smtpad")
    .map(getSmtPadLayerSignature)
    .sort()

export const compareSupplierFootprint = ({
  localCircuitJson,
  localPcbComponentId,
  supplierCircuitJson,
}: {
  localCircuitJson: AnyCircuitElement[]
  localPcbComponentId: string
  supplierCircuitJson: AnyCircuitElement[]
}): SupplierFootprintComparison => {
  const localPcbComponent = getPcbComponent({
    circuitJson: localCircuitJson,
    pcbComponentId: localPcbComponentId,
  })
  const supplierPcbComponent = getPcbComponent({
    circuitJson: supplierCircuitJson,
  })
  const mismatches: SupplierFootprintMismatch[] = []

  if (!localPcbComponent || !supplierPcbComponent) {
    return {
      matches: false,
      localPrimitiveCount: 0,
      supplierPrimitiveCount: 0,
      mismatches: [
        {
          message: !localPcbComponent
            ? "local PCB component was not found"
            : "supplier PCB component was not found",
        },
      ],
    }
  }

  const localFootprint = getComponentFootprint({
    circuitJson: localCircuitJson,
    pcbComponent: localPcbComponent,
  })
  const supplierFootprint = alignSupplierFootprint({
    localPcbComponent,
    supplierFootprint: getComponentFootprint({
      circuitJson: supplierCircuitJson,
      pcbComponent: supplierPcbComponent,
    }),
    supplierPcbComponent,
  })
  const comparison = summarizeCopperComparison(
    localFootprint,
    supplierFootprint,
  )
  const localPadLayerSignatures = getSmtPadLayerSignatures(localFootprint)
  const supplierPadLayerSignatures = getSmtPadLayerSignatures(supplierFootprint)

  for (const [primitiveName, localCount, supplierCount] of [
    ["pad", localFootprint.pads.length, supplierFootprint.pads.length],
    [
      "mechanical hole",
      localFootprint.holes.length,
      supplierFootprint.holes.length,
    ],
  ] as const) {
    if (localCount !== supplierCount) {
      mismatches.push({
        message: `${primitiveName} count ${localCount} != ${supplierCount}`,
      })
    }
  }

  if (
    comparison.copperIntersectionOverUnion < MINIMUM_INTERSECTION_OVER_UNION
  ) {
    mismatches.push({
      message: `copper geometry ${formatPercentage(comparison.copperIntersectionOverUnion)} match`,
    })
  }
  if (comparison.holeIntersectionOverUnion < MINIMUM_INTERSECTION_OVER_UNION) {
    mismatches.push({
      message: `drill geometry ${formatPercentage(comparison.holeIntersectionOverUnion)} match`,
    })
  }
  if (
    localPadLayerSignatures.join("|") !== supplierPadLayerSignatures.join("|")
  ) {
    mismatches.push({ message: "pad layer assignments differ" })
  }
  mismatches.push(
    ...comparison.pinMismatches.map((mismatch) => ({
      message: formatPinMismatch(mismatch),
    })),
  )

  return {
    matches: mismatches.length === 0,
    localPrimitiveCount: getPrimitiveCount(localFootprint),
    supplierPrimitiveCount: getPrimitiveCount(supplierFootprint),
    mismatches,
  }
}
