import type { AnyCircuitElement } from "circuit-json"

type CircuitRecord = AnyCircuitElement & Record<string, unknown>

type Point = { x: number; y: number }

type PcbComponentRecord = CircuitRecord & {
  type: "pcb_component"
  pcb_component_id: string
  center: Point
  layer?: string
  rotation?: number
}

type NormalizedPrimitive = {
  type: "pcb_smtpad" | "pcb_plated_hole" | "pcb_hole"
  pinNumber: string | null
  shape: string
  layer: string | null
  position: Point
  metrics: Record<string, number>
  polygonPoints?: Point[]
}

export type SupplierFootprintMismatch = {
  message: string
}

export type SupplierFootprintComparison = {
  matches: boolean
  localPrimitiveCount: number
  supplierPrimitiveCount: number
  mismatches: SupplierFootprintMismatch[]
}

const POSITION_TOLERANCE_MM = 0.01
const DIMENSION_TOLERANCE_MM = 0.01
const ROTATION_TOLERANCE_DEGREES = 0.5

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const normalizeDegrees = (degrees: number) => {
  const normalized = degrees % 360
  return normalized < 0 ? normalized + 360 : normalized
}

const getComponent = (
  circuitJson: AnyCircuitElement[],
  pcbComponentId?: string,
): PcbComponentRecord | null => {
  const components = circuitJson.filter(
    (element): element is CircuitRecord =>
      isRecord(element) && element.type === "pcb_component",
  )

  const component = pcbComponentId
    ? components.find((element) => element.pcb_component_id === pcbComponentId)
    : components[0]

  if (
    !component ||
    typeof component.pcb_component_id !== "string" ||
    !isRecord(component.center) ||
    !isFiniteNumber(component.center.x) ||
    !isFiniteNumber(component.center.y)
  ) {
    return null
  }

  return component as PcbComponentRecord
}

const getPinNumberForPrimitive = (
  primitive: CircuitRecord,
  circuitJson: AnyCircuitElement[],
): string | null => {
  if (typeof primitive.pcb_port_id === "string") {
    const pcbPort = circuitJson.find(
      (element) =>
        isRecord(element) &&
        element.type === "pcb_port" &&
        element.pcb_port_id === primitive.pcb_port_id,
    ) as CircuitRecord | undefined

    if (pcbPort && typeof pcbPort.source_port_id === "string") {
      const sourcePort = circuitJson.find(
        (element) =>
          isRecord(element) &&
          element.type === "source_port" &&
          element.source_port_id === pcbPort.source_port_id,
      ) as CircuitRecord | undefined

      if (
        sourcePort &&
        (typeof sourcePort.pin_number === "number" ||
          typeof sourcePort.pin_number === "string")
      ) {
        return String(sourcePort.pin_number)
      }
    }
  }

  if (Array.isArray(primitive.port_hints)) {
    for (const hint of primitive.port_hints) {
      if (typeof hint !== "string") continue
      const match = /^(?:pin)?(\d+)$/i.exec(hint.trim())
      if (match) return match[1]!
    }
  }

  return null
}

const toComponentLocalPoint = (
  point: Point,
  component: PcbComponentRecord,
): Point => {
  const deltaX = point.x - component.center.x
  const deltaY = point.y - component.center.y
  const rotationRadians = -((component.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rotationRadians)
  const sin = Math.sin(rotationRadians)
  const rotated = {
    x: deltaX * cos - deltaY * sin,
    y: deltaX * sin + deltaY * cos,
  }

  return component.layer === "bottom"
    ? { x: rotated.x, y: -rotated.y }
    : rotated
}

const toComponentLocalAngle = (
  angle: number,
  component: PcbComponentRecord,
) => {
  const unrotated = angle - (component.rotation ?? 0)
  return normalizeDegrees(component.layer === "bottom" ? -unrotated : unrotated)
}

const normalizeOrientedDimensions = (
  width: number,
  height: number,
  angle: number,
) => {
  let normalizedAngle = normalizeDegrees(angle) % 180
  let normalizedWidth = width
  let normalizedHeight = height

  if (normalizedAngle >= 90) {
    normalizedAngle -= 90
    normalizedWidth = height
    normalizedHeight = width
  }

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    rotation: normalizedAngle,
  }
}

const getPrimitivePosition = (primitive: CircuitRecord): Point | null => {
  if (isFiniteNumber(primitive.x) && isFiniteNumber(primitive.y)) {
    return { x: primitive.x, y: primitive.y }
  }

  if (Array.isArray(primitive.points)) {
    const points = primitive.points.filter(
      (point): point is Point =>
        isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y),
    )
    if (points.length === 0) return null

    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }

  return null
}

const getLayer = (primitive: CircuitRecord, component: PcbComponentRecord) => {
  if (primitive.type !== "pcb_smtpad" || typeof primitive.layer !== "string") {
    return null
  }

  if (component.layer !== "bottom") return primitive.layer
  if (primitive.layer === "bottom") return "top"
  if (primitive.layer === "top") return "bottom"
  return primitive.layer
}

const addNumberMetric = (
  metrics: Record<string, number>,
  primitive: CircuitRecord,
  key: string,
  defaultValue?: number,
) => {
  const value = primitive[key]
  if (isFiniteNumber(value)) {
    metrics[key] = value
  } else if (defaultValue !== undefined) {
    metrics[key] = defaultValue
  }
}

const getNormalizedPrimitive = (
  primitive: CircuitRecord,
  component: PcbComponentRecord,
  circuitJson: AnyCircuitElement[],
): NormalizedPrimitive | null => {
  if (
    primitive.type !== "pcb_smtpad" &&
    primitive.type !== "pcb_plated_hole" &&
    primitive.type !== "pcb_hole"
  ) {
    return null
  }

  const globalPosition = getPrimitivePosition(primitive)
  if (!globalPosition) return null

  const metrics: Record<string, number> = {}
  let shape = ""
  let polygonPoints: Point[] | undefined

  if (primitive.type === "pcb_smtpad") {
    shape = typeof primitive.shape === "string" ? primitive.shape : "unknown"

    if (shape === "rect" || shape === "rotated_rect") {
      shape = "rect"
      if (
        !isFiniteNumber(primitive.width) ||
        !isFiniteNumber(primitive.height)
      ) {
        return null
      }
      Object.assign(
        metrics,
        normalizeOrientedDimensions(
          primitive.width,
          primitive.height,
          toComponentLocalAngle(
            isFiniteNumber(primitive.ccw_rotation) ? primitive.ccw_rotation : 0,
            component,
          ),
        ),
      )
      addNumberMetric(metrics, primitive, "rect_border_radius", 0)
      addNumberMetric(metrics, primitive, "corner_radius", 0)
    } else if (shape === "pill" || shape === "rotated_pill") {
      shape = "pill"
      if (
        !isFiniteNumber(primitive.width) ||
        !isFiniteNumber(primitive.height)
      ) {
        return null
      }
      Object.assign(
        metrics,
        normalizeOrientedDimensions(
          primitive.width,
          primitive.height,
          toComponentLocalAngle(
            isFiniteNumber(primitive.ccw_rotation) ? primitive.ccw_rotation : 0,
            component,
          ),
        ),
      )
      addNumberMetric(metrics, primitive, "radius", 0)
    } else if (shape === "circle") {
      addNumberMetric(metrics, primitive, "radius")
    } else if (shape === "polygon" && Array.isArray(primitive.points)) {
      polygonPoints = primitive.points
        .filter(
          (point): point is Point =>
            isRecord(point) &&
            isFiniteNumber(point.x) &&
            isFiniteNumber(point.y),
        )
        .map((point) => toComponentLocalPoint(point, component))
        .map((point) => ({
          x: point.x - toComponentLocalPoint(globalPosition, component).x,
          y: point.y - toComponentLocalPoint(globalPosition, component).y,
        }))
        .sort((a, b) => a.x - b.x || a.y - b.y)
    }

    addNumberMetric(metrics, primitive, "soldermask_margin", 0)
    addNumberMetric(metrics, primitive, "solderpaste_margin", 0)
  } else if (primitive.type === "pcb_plated_hole") {
    shape = typeof primitive.shape === "string" ? primitive.shape : "unknown"
    if (
      shape === "circular_hole_with_rect_pad" &&
      isFiniteNumber(primitive.rect_pad_width) &&
      isFiniteNumber(primitive.rect_pad_height) &&
      Math.abs(primitive.rect_pad_width - primitive.rect_pad_height) <=
        DIMENSION_TOLERANCE_MM &&
      isFiniteNumber(primitive.rect_border_radius) &&
      Math.abs(primitive.rect_border_radius - primitive.rect_pad_width / 2) <=
        DIMENSION_TOLERANCE_MM
    ) {
      shape = "circle"
      metrics.outer_diameter = primitive.rect_pad_width
      addNumberMetric(metrics, primitive, "hole_diameter")
    } else if (
      shape === "pill_hole_with_rect_pad" ||
      shape === "rotated_pill_hole_with_rect_pad"
    ) {
      shape = "rect_pad_with_pill_hole"
      if (
        !isFiniteNumber(primitive.rect_pad_width) ||
        !isFiniteNumber(primitive.rect_pad_height) ||
        !isFiniteNumber(primitive.hole_width) ||
        !isFiniteNumber(primitive.hole_height)
      ) {
        return null
      }

      const pad = normalizeOrientedDimensions(
        primitive.rect_pad_width,
        primitive.rect_pad_height,
        toComponentLocalAngle(
          isFiniteNumber(primitive.rect_ccw_rotation)
            ? primitive.rect_ccw_rotation
            : 0,
          component,
        ),
      )
      const hole = normalizeOrientedDimensions(
        primitive.hole_width,
        primitive.hole_height,
        toComponentLocalAngle(
          isFiniteNumber(primitive.hole_ccw_rotation)
            ? primitive.hole_ccw_rotation
            : 0,
          component,
        ),
      )
      metrics.pad_width = pad.width
      metrics.pad_height = pad.height
      metrics.pad_rotation = pad.rotation
      metrics.hole_width = hole.width
      metrics.hole_height = hole.height
      metrics.hole_rotation = hole.rotation
      addNumberMetric(metrics, primitive, "rect_border_radius", 0)
      addNumberMetric(metrics, primitive, "hole_offset_x", 0)
      addNumberMetric(metrics, primitive, "hole_offset_y", 0)
    } else if (shape === "oval" || shape === "pill") {
      shape = "pill"
      if (
        !isFiniteNumber(primitive.outer_width) ||
        !isFiniteNumber(primitive.outer_height)
      ) {
        return null
      }
      const oriented = normalizeOrientedDimensions(
        primitive.outer_width,
        primitive.outer_height,
        toComponentLocalAngle(
          isFiniteNumber(primitive.ccw_rotation) ? primitive.ccw_rotation : 0,
          component,
        ),
      )
      metrics.outer_width = oriented.width
      metrics.outer_height = oriented.height
      metrics.rotation = oriented.rotation

      if (
        isFiniteNumber(primitive.hole_width) &&
        isFiniteNumber(primitive.hole_height)
      ) {
        const hole = normalizeOrientedDimensions(
          primitive.hole_width,
          primitive.hole_height,
          toComponentLocalAngle(
            isFiniteNumber(primitive.ccw_rotation) ? primitive.ccw_rotation : 0,
            component,
          ),
        )
        metrics.hole_width = hole.width
        metrics.hole_height = hole.height
      }
    } else if (shape === "circle") {
      addNumberMetric(metrics, primitive, "outer_diameter")
      addNumberMetric(metrics, primitive, "hole_diameter")
    } else if (shape === "circular_hole_with_rect_pad") {
      shape = "rect_pad_with_circle_hole"
      addNumberMetric(metrics, primitive, "hole_diameter")
      addNumberMetric(metrics, primitive, "rect_pad_width")
      addNumberMetric(metrics, primitive, "rect_pad_height")
      addNumberMetric(metrics, primitive, "rect_border_radius", 0)
      addNumberMetric(metrics, primitive, "hole_offset_x", 0)
      addNumberMetric(metrics, primitive, "hole_offset_y", 0)
    } else {
      for (const key of [
        "hole_diameter",
        "hole_width",
        "hole_height",
        "rect_pad_width",
        "rect_pad_height",
        "rect_border_radius",
        "hole_offset_x",
        "hole_offset_y",
        "hole_ccw_rotation",
        "rect_ccw_rotation",
      ]) {
        addNumberMetric(metrics, primitive, key, 0)
      }
    }
    addNumberMetric(metrics, primitive, "soldermask_margin", 0)
  } else {
    shape =
      typeof primitive.hole_shape === "string"
        ? primitive.hole_shape
        : "unknown"
    if (shape === "oval" || shape === "pill" || shape === "rotated_pill") {
      shape = "pill"
      if (
        !isFiniteNumber(primitive.hole_width) ||
        !isFiniteNumber(primitive.hole_height)
      ) {
        return null
      }
      const oriented = normalizeOrientedDimensions(
        primitive.hole_width,
        primitive.hole_height,
        toComponentLocalAngle(
          isFiniteNumber(primitive.ccw_rotation) ? primitive.ccw_rotation : 0,
          component,
        ),
      )
      metrics.hole_width = oriented.width
      metrics.hole_height = oriented.height
      metrics.rotation = oriented.rotation
    } else if (shape === "circle" || shape === "square") {
      addNumberMetric(metrics, primitive, "hole_diameter")
    } else if (shape === "rect") {
      if (
        !isFiniteNumber(primitive.hole_width) ||
        !isFiniteNumber(primitive.hole_height)
      ) {
        return null
      }
      const oriented = normalizeOrientedDimensions(
        primitive.hole_width,
        primitive.hole_height,
        toComponentLocalAngle(0, component),
      )
      metrics.hole_width = oriented.width
      metrics.hole_height = oriented.height
      metrics.rotation = oriented.rotation
    }
    addNumberMetric(metrics, primitive, "soldermask_margin", 0)
  }

  return {
    type: primitive.type,
    pinNumber:
      primitive.type === "pcb_hole"
        ? null
        : getPinNumberForPrimitive(primitive, circuitJson),
    shape,
    layer: getLayer(primitive, component),
    position: toComponentLocalPoint(globalPosition, component),
    metrics,
    polygonPoints,
  }
}

const getFootprintPrimitives = (
  circuitJson: AnyCircuitElement[],
  component: PcbComponentRecord,
) => {
  const primitives = circuitJson
    .filter(
      (element): element is CircuitRecord =>
        isRecord(element) &&
        (element.type === "pcb_smtpad" ||
          element.type === "pcb_plated_hole" ||
          element.type === "pcb_hole") &&
        element.pcb_component_id === component.pcb_component_id,
    )
    .map((primitive) =>
      getNormalizedPrimitive(primitive, component, circuitJson),
    )
    .filter((primitive): primitive is NormalizedPrimitive => primitive !== null)

  // pcb_component.center is the physical bounds center after placement. Edge
  // alignment and asymmetric bodies can move it away from the transform origin,
  // so remove the remaining common translation using numbered pads as anchors.
  // Mechanical holes are intentionally excluded from the anchor so an extra or
  // missing locating hole cannot shift every electrical-pad comparison.
  const anchorPrimitives = primitives.some(
    (primitive) => primitive.pinNumber !== null,
  )
    ? primitives.filter((primitive) => primitive.pinNumber !== null)
    : primitives
  if (anchorPrimitives.length === 0) return primitives

  const anchor = anchorPrimitives.reduce(
    (sum, primitive) => ({
      x: sum.x + primitive.position.x / anchorPrimitives.length,
      y: sum.y + primitive.position.y / anchorPrimitives.length,
    }),
    { x: 0, y: 0 },
  )

  return primitives.map((primitive) => ({
    ...primitive,
    position: {
      x: primitive.position.x - anchor.x,
      y: primitive.position.y - anchor.y,
    },
  }))
}

const formatNumber = (value: number) => Number(value.toFixed(4)).toString()

const compareNumber = (
  label: string,
  local: number,
  supplier: number,
  tolerance: number,
) =>
  Math.abs(local - supplier) <= tolerance
    ? null
    : `${label} ${formatNumber(local)} != ${formatNumber(supplier)}`

const getPrimitiveDifferences = (
  local: NormalizedPrimitive,
  supplier: NormalizedPrimitive,
) => {
  const differences: string[] = []
  if (local.type !== supplier.type) {
    differences.push(`type ${local.type} != ${supplier.type}`)
  }
  if (local.shape !== supplier.shape) {
    differences.push(`shape ${local.shape} != ${supplier.shape}`)
  }
  if (local.layer !== supplier.layer) {
    differences.push(
      `layer ${local.layer ?? "n/a"} != ${supplier.layer ?? "n/a"}`,
    )
  }

  const xDifference = compareNumber(
    "x",
    local.position.x,
    supplier.position.x,
    POSITION_TOLERANCE_MM,
  )
  const yDifference = compareNumber(
    "y",
    local.position.y,
    supplier.position.y,
    POSITION_TOLERANCE_MM,
  )
  if (xDifference) differences.push(xDifference)
  if (yDifference) differences.push(yDifference)

  const metricNames = new Set([
    ...Object.keys(local.metrics),
    ...Object.keys(supplier.metrics),
  ])
  for (const metricName of metricNames) {
    const localValue = local.metrics[metricName]
    const supplierValue = supplier.metrics[metricName]
    if (localValue === undefined || supplierValue === undefined) {
      differences.push(
        `${metricName} ${localValue ?? "missing"} != ${supplierValue ?? "missing"}`,
      )
      continue
    }

    const difference = compareNumber(
      metricName,
      localValue,
      supplierValue,
      metricName.includes("rotation")
        ? ROTATION_TOLERANCE_DEGREES
        : DIMENSION_TOLERANCE_MM,
    )
    if (difference) differences.push(difference)
  }

  if (local.polygonPoints || supplier.polygonPoints) {
    if (!local.polygonPoints || !supplier.polygonPoints) {
      differences.push("polygon geometry is missing")
    } else if (local.polygonPoints.length !== supplier.polygonPoints.length) {
      differences.push(
        `polygon point count ${local.polygonPoints.length} != ${supplier.polygonPoints.length}`,
      )
    } else {
      for (let index = 0; index < local.polygonPoints.length; index++) {
        const localPoint = local.polygonPoints[index]!
        const supplierPoint = supplier.polygonPoints[index]!
        const x = compareNumber(
          `polygon[${index}].x`,
          localPoint.x,
          supplierPoint.x,
          POSITION_TOLERANCE_MM,
        )
        const y = compareNumber(
          `polygon[${index}].y`,
          localPoint.y,
          supplierPoint.y,
          POSITION_TOLERANCE_MM,
        )
        if (x) differences.push(x)
        if (y) differences.push(y)
      }
    }
  }

  return differences
}

const getPrimitiveGroupKey = (primitive: NormalizedPrimitive) =>
  `${primitive.type}:${primitive.pinNumber ?? "mechanical"}`

const formatPrimitiveLabel = (primitive: NormalizedPrimitive) =>
  primitive.pinNumber
    ? `${primitive.type} pin ${primitive.pinNumber}`
    : `${primitive.type} mechanical primitive`

export const compareSupplierFootprint = ({
  localCircuitJson,
  localPcbComponentId,
  supplierCircuitJson,
}: {
  localCircuitJson: AnyCircuitElement[]
  localPcbComponentId: string
  supplierCircuitJson: AnyCircuitElement[]
}): SupplierFootprintComparison => {
  const localComponent = getComponent(localCircuitJson, localPcbComponentId)
  const supplierComponent = getComponent(supplierCircuitJson)
  const mismatches: SupplierFootprintMismatch[] = []

  if (!localComponent) {
    return {
      matches: false,
      localPrimitiveCount: 0,
      supplierPrimitiveCount: 0,
      mismatches: [{ message: "local PCB component was not found" }],
    }
  }

  if (!supplierComponent) {
    return {
      matches: false,
      localPrimitiveCount: 0,
      supplierPrimitiveCount: 0,
      mismatches: [{ message: "supplier PCB component was not found" }],
    }
  }

  const localPrimitives = getFootprintPrimitives(
    localCircuitJson,
    localComponent,
  )
  const supplierPrimitives = getFootprintPrimitives(
    supplierCircuitJson,
    supplierComponent,
  )

  if (localPrimitives.length !== supplierPrimitives.length) {
    mismatches.push({
      message: `primitive count ${localPrimitives.length} != ${supplierPrimitives.length}`,
    })
  }

  const groupKeys = new Set([
    ...localPrimitives.map(getPrimitiveGroupKey),
    ...supplierPrimitives.map(getPrimitiveGroupKey),
  ])

  for (const groupKey of groupKeys) {
    const localGroup = localPrimitives.filter(
      (primitive) => getPrimitiveGroupKey(primitive) === groupKey,
    )
    const supplierGroup = supplierPrimitives.filter(
      (primitive) => getPrimitiveGroupKey(primitive) === groupKey,
    )

    if (localGroup.length !== supplierGroup.length) {
      const example = localGroup[0] ?? supplierGroup[0]
      mismatches.push({
        message: `${example ? formatPrimitiveLabel(example) : groupKey} count ${localGroup.length} != ${supplierGroup.length}`,
      })
      continue
    }

    const unmatchedSupplier = [...supplierGroup]
    for (const localPrimitive of localGroup) {
      let bestMatchIndex = -1
      let bestDifferences: string[] | null = null

      for (let index = 0; index < unmatchedSupplier.length; index++) {
        const differences = getPrimitiveDifferences(
          localPrimitive,
          unmatchedSupplier[index]!,
        )
        if (differences.length === 0) {
          bestMatchIndex = index
          bestDifferences = differences
          break
        }
        if (!bestDifferences || differences.length < bestDifferences.length) {
          bestMatchIndex = index
          bestDifferences = differences
        }
      }

      if (bestMatchIndex < 0 || !bestDifferences) continue
      unmatchedSupplier.splice(bestMatchIndex, 1)
      if (bestDifferences.length > 0) {
        mismatches.push({
          message: `${formatPrimitiveLabel(localPrimitive)} mismatch: ${bestDifferences.join(", ")}`,
        })
      }
    }
  }

  return {
    matches: mismatches.length === 0,
    localPrimitiveCount: localPrimitives.length,
    supplierPrimitiveCount: supplierPrimitives.length,
    mismatches,
  }
}
