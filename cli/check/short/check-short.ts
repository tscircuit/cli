import fs from "node:fs/promises"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  convertSoupToGerberCommands,
  stringifyExcellonDrill,
  stringifyGerberCommandLayers,
} from "circuit-json-to-gerber"
import JSZip from "jszip"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

import {
  makePillShape,
  makeRotatedRectPolygon,
  shapesTouch,
  type CopperShapeGeometry,
  type Point,
} from "./geometry"
type LayerName =
  | "top"
  | "bottom"
  | "inner1"
  | "inner2"
  | "inner3"
  | "inner4"
  | "inner5"
  | "inner6"

type CopperShape = {
  id: string
  type: string
  layer: LayerName
  netKey: string
  geometry: CopperShapeGeometry
}

type GerberCopperShape = CopperShape & {
  gerberGeometry: CopperShapeGeometry
}

type GerberPrimitiveShape = {
  layer: LayerName
  geometry: CopperShapeGeometry
  commandStartIndex: number
  commandEndIndex: number
  metadataNetKey?: string
}

export type ShortCheckIssue = {
  layer: LayerName
  firstId: string
  firstType: string
  firstNetKey: string
  secondId: string
  secondType: string
  secondNetKey: string
}

export type ShortCheckResult = {
  gerberOutputPath: string
  gerberFileCount: number
  shortCount: number
  shorts: ShortCheckIssue[]
}

type CircuitJsonRecord = Record<string, any>

const COPPER_LAYERS: LayerName[] = [
  "top",
  "bottom",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
]

const isRecord = (value: unknown): value is CircuitJsonRecord =>
  typeof value === "object" && value !== null

const getElementId = (element: CircuitJsonRecord) =>
  element.pcb_trace_id ??
  element.pcb_smtpad_id ??
  element.pcb_plated_hole_id ??
  element.pcb_via_id ??
  element.pcb_copper_pour_id ??
  element.type ??
  "unknown"

const getLayerName = (layer: unknown): LayerName | undefined => {
  const layerName =
    typeof layer === "string" ? layer : isRecord(layer) ? layer.name : undefined
  return COPPER_LAYERS.includes(layerName as LayerName)
    ? (layerName as LayerName)
    : undefined
}

const getLayerRange = (fromLayer: LayerName, toLayer: LayerName) => {
  const fromIndex = COPPER_LAYERS.indexOf(fromLayer)
  const toIndex = COPPER_LAYERS.indexOf(toLayer)
  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  return COPPER_LAYERS.slice(start, end + 1)
}

const getSourceTraceKey = (trace: CircuitJsonRecord) =>
  trace.subcircuit_connectivity_map_key ??
  (Array.isArray(trace.connected_source_net_ids) &&
  trace.connected_source_net_ids.length > 0
    ? trace.connected_source_net_ids.join("+")
    : undefined) ??
  trace.source_trace_id

const buildNetResolver = (circuitJson: AnyCircuitElement[]) => {
  const sourceTraceKeyById = new Map<string, string>()
  const sourceTraceKeyBySourcePortId = new Map<string, string>()
  const sourceNetKeyById = new Map<string, string>()
  const sourcePortIdByPcbPortId = new Map<string, string>()
  const traceKeyByPcbTraceId = new Map<string, string>()

  for (const element of circuitJson) {
    if (!isRecord(element)) continue
    const record = element as CircuitJsonRecord
    if (
      record.type === "source_net" &&
      typeof record.source_net_id === "string"
    ) {
      sourceNetKeyById.set(
        record.source_net_id,
        record.subcircuit_connectivity_map_key ??
          record.name ??
          record.source_net_id,
      )
    }
    if (record.type === "pcb_port" && typeof record.pcb_port_id === "string") {
      sourcePortIdByPcbPortId.set(record.pcb_port_id, record.source_port_id)
    }
  }

  for (const element of circuitJson) {
    if (!isRecord(element) || element.type !== "source_trace") continue
    const record = element as CircuitJsonRecord
    const key = getSourceTraceKey(record)
    if (!key || typeof record.source_trace_id !== "string") continue
    sourceTraceKeyById.set(record.source_trace_id, key)
    for (const sourcePortId of record.connected_source_port_ids ?? []) {
      sourceTraceKeyBySourcePortId.set(sourcePortId, key)
    }
    for (const sourceNetId of record.connected_source_net_ids ?? []) {
      sourceNetKeyById.set(sourceNetId, key)
    }
  }

  for (const element of circuitJson) {
    if (!isRecord(element) || element.type !== "pcb_trace") continue
    const record = element as CircuitJsonRecord
    const traceId = record.pcb_trace_id
    const sourceTraceId = record.source_trace_id ?? record.connection_name
    const key =
      (typeof sourceTraceId === "string" &&
        (sourceTraceKeyById.get(sourceTraceId) ??
          sourceNetKeyById.get(sourceTraceId))) ??
      record.subcircuit_connectivity_map_key ??
      sourceTraceId ??
      traceId
    if (typeof traceId === "string" && typeof key === "string") {
      traceKeyByPcbTraceId.set(traceId, key)
    }
  }

  const getKey = (element: CircuitJsonRecord) => {
    if (typeof element.subcircuit_connectivity_map_key === "string") {
      return element.subcircuit_connectivity_map_key
    }
    if (typeof element.source_net_id === "string") {
      return (
        sourceNetKeyById.get(element.source_net_id) ?? element.source_net_id
      )
    }
    if (typeof element.pcb_trace_id === "string") {
      const traceKey = traceKeyByPcbTraceId.get(element.pcb_trace_id)
      if (traceKey) return traceKey
    }
    if (typeof element.source_trace_id === "string") {
      const traceKey = sourceTraceKeyById.get(element.source_trace_id)
      if (traceKey) return traceKey
    }
    if (typeof element.pcb_port_id === "string") {
      const sourcePortId = sourcePortIdByPcbPortId.get(element.pcb_port_id)
      if (sourcePortId) {
        return sourceTraceKeyBySourcePortId.get(sourcePortId) ?? sourcePortId
      }
    }
    return undefined
  }

  return { getKey }
}

const pushShape = (
  shapes: CopperShape[],
  element: CircuitJsonRecord,
  layer: LayerName | undefined,
  netKey: string | undefined,
  geometry: CopperShapeGeometry | undefined,
) => {
  if (!layer || !netKey || !geometry) return
  shapes.push({
    id: getElementId(element),
    type: element.type,
    layer,
    netKey,
    geometry,
  })
}

const getLayerFromGerberLayerName = (gerberLayerName: string) => {
  if (gerberLayerName === "F_Cu") return "top"
  if (gerberLayerName === "B_Cu") return "bottom"
  const innerMatch = gerberLayerName.match(/^In([1-6])_Cu$/)
  return innerMatch ? (`inner${innerMatch[1]}` as LayerName) : undefined
}

const polygonArea = (points: Point[]) => {
  let area = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const nextPoint = points[(index + 1) % points.length]
    area += point.x * nextPoint.y - nextPoint.x * point.y
  }
  return Math.abs(area) / 2
}

const shapeArea = (shape: CopperShapeGeometry) => {
  if (shape.kind === "circle") return Math.PI * shape.radius ** 2
  if (shape.kind === "rect") return shape.width * shape.height
  if (shape.kind === "segment") {
    const length = Math.hypot(
      shape.end.x - shape.start.x,
      shape.end.y - shape.start.y,
    )
    return length * shape.radius * 2 + Math.PI * shape.radius ** 2
  }
  return Math.max(
    0,
    polygonArea(shape.points) -
      (shape.holes ?? []).reduce((total, hole) => total + polygonArea(hole), 0),
  )
}

const getShapeCenter = (shape: CopperShapeGeometry): Point => {
  if (shape.kind === "circle" || shape.kind === "rect") return shape.center
  if (shape.kind === "segment") {
    return {
      x: (shape.start.x + shape.end.x) / 2,
      y: (shape.start.y + shape.end.y) / 2,
    }
  }
  const pointCount = shape.points.length || 1
  return {
    x: shape.points.reduce((sum, point) => sum + point.x, 0) / pointCount,
    y: shape.points.reduce((sum, point) => sum + point.y, 0) / pointCount,
  }
}

const pointDistance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y)

const sanitizeGerberAttributeValue = (value: string) =>
  value.replace(/[,*%\r\n]/g, "_")

const getShapeMatchScore = (
  gerberShape: CopperShapeGeometry,
  circuitShape: CopperShapeGeometry,
) => {
  if (gerberShape.kind === "segment" && circuitShape.kind === "segment") {
    return Math.min(
      pointDistance(gerberShape.start, circuitShape.start) +
        pointDistance(gerberShape.end, circuitShape.end),
      pointDistance(gerberShape.start, circuitShape.end) +
        pointDistance(gerberShape.end, circuitShape.start),
    )
  }
  if (gerberShape.kind === "circle" && circuitShape.kind === "circle") {
    return (
      pointDistance(gerberShape.center, circuitShape.center) +
      Math.abs(gerberShape.radius - circuitShape.radius)
    )
  }
  if (gerberShape.kind === "rect" && circuitShape.kind === "rect") {
    return (
      pointDistance(gerberShape.center, circuitShape.center) +
      Math.abs(gerberShape.width - circuitShape.width) +
      Math.abs(gerberShape.height - circuitShape.height)
    )
  }
  const gerberCenter = getShapeCenter(gerberShape)
  const circuitCenter = getShapeCenter(circuitShape)
  return (
    pointDistance(gerberCenter, circuitCenter) +
    Math.abs(shapeArea(gerberShape) - shapeArea(circuitShape))
  )
}

const collectTraceShapes = (
  shapes: CopperShape[],
  trace: CircuitJsonRecord,
  netKey: string | undefined,
) => {
  const route = Array.isArray(trace.route) ? trace.route : []
  for (let index = 0; index < route.length - 1; index++) {
    const start = route[index]
    const end = route[index + 1]
    if (!isRecord(start) || !isRecord(end)) continue

    if (start.route_type === "wire" && end.route_type === "wire") {
      const startLayer = getLayerName(start.layer)
      const endLayer = getLayerName(end.layer)
      if (startLayer !== endLayer) continue
      pushShape(shapes, trace, startLayer, netKey, {
        kind: "segment",
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        radius:
          Math.max(
            start.width ?? end.width ?? 0,
            end.width ?? start.width ?? 0,
          ) / 2,
      })
    }
    if (start.route_type === "wire" && end.route_type === "via") {
      const layer = getLayerName(start.layer)
      const fromLayer = getLayerName(end.from_layer)
      const toLayer = getLayerName(end.to_layer)
      const viaLayers =
        fromLayer && toLayer ? getLayerRange(fromLayer, toLayer) : []
      if (layer && viaLayers.includes(layer)) {
        pushShape(shapes, trace, layer, netKey, {
          kind: "segment",
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
          radius: (start.width ?? end.outer_diameter ?? 0) / 2,
        })
      }
    }
    if (start.route_type === "via" && end.route_type === "wire") {
      const layer = getLayerName(end.layer)
      const fromLayer = getLayerName(start.from_layer)
      const toLayer = getLayerName(start.to_layer)
      const viaLayers =
        fromLayer && toLayer ? getLayerRange(fromLayer, toLayer) : []
      if (layer && viaLayers.includes(layer)) {
        pushShape(shapes, trace, layer, netKey, {
          kind: "segment",
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
          radius: (end.width ?? start.outer_diameter ?? 0) / 2,
        })
      }
    }
  }

  for (const routePoint of route) {
    if (!isRecord(routePoint)) continue
    if (routePoint.route_type === "via") {
      const fromLayer = getLayerName(routePoint.from_layer)
      const toLayer = getLayerName(routePoint.to_layer)
      const layers =
        fromLayer && toLayer ? getLayerRange(fromLayer, toLayer) : []
      for (const layer of layers) {
        pushShape(shapes, trace, layer, netKey, {
          kind: "circle",
          center: { x: routePoint.x, y: routePoint.y },
          radius: (routePoint.outer_diameter ?? 0.6) / 2,
        })
      }
    }
    if (routePoint.route_type === "through_pad") {
      const startLayer = getLayerName(routePoint.start_layer)
      const endLayer = getLayerName(routePoint.end_layer)
      if (startLayer !== endLayer) continue
      pushShape(shapes, trace, startLayer, netKey, {
        kind: "segment",
        start: routePoint.start,
        end: routePoint.end,
        radius: routePoint.width / 2,
      })
    }
  }
}

const collectPadShape = (
  shapes: CopperShape[],
  pad: CircuitJsonRecord,
  netKey: string | undefined,
) => {
  const layer = getLayerName(pad.layer)
  if (pad.shape === "circle") {
    pushShape(shapes, pad, layer, netKey, {
      kind: "circle",
      center: { x: pad.x, y: pad.y },
      radius: pad.radius,
    })
    return
  }

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    if (pad.shape === "rotated_rect" || pad.ccw_rotation) {
      pushShape(
        shapes,
        pad,
        layer,
        netKey,
        makeRotatedRectPolygon(
          { x: pad.x, y: pad.y },
          pad.width,
          pad.height,
          pad.ccw_rotation,
        ),
      )
      return
    }

    pushShape(shapes, pad, layer, netKey, {
      kind: "rect",
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
    })
    return
  }

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    pushShape(
      shapes,
      pad,
      layer,
      netKey,
      makePillShape(
        { x: pad.x, y: pad.y },
        pad.width ?? (pad.radius ? pad.radius * 2 : 0),
        pad.height ?? (pad.radius ? pad.radius * 2 : 0),
        pad.ccw_rotation,
      ),
    )
    return
  }

  if (pad.shape === "polygon" && Array.isArray(pad.points)) {
    pushShape(shapes, pad, layer, netKey, {
      kind: "polygon",
      points: pad.points,
    })
  }
}

const collectViaShape = (
  shapes: CopperShape[],
  via: CircuitJsonRecord,
  netKey: string | undefined,
) => {
  for (const rawLayer of via.layers ?? []) {
    pushShape(shapes, via, getLayerName(rawLayer), netKey, {
      kind: "circle",
      center: { x: via.x, y: via.y },
      radius: (via.outer_diameter ?? 0.6) / 2,
    })
  }
}

const collectPlatedHoleShape = (
  shapes: CopperShape[],
  hole: CircuitJsonRecord,
  netKey: string | undefined,
) => {
  for (const rawLayer of hole.layers ?? []) {
    const layer = getLayerName(rawLayer)
    if (hole.shape === "circle") {
      pushShape(shapes, hole, layer, netKey, {
        kind: "circle",
        center: { x: hole.x, y: hole.y },
        radius: hole.outer_diameter / 2,
      })
      continue
    }
    const width =
      hole.outer_width ?? hole.rect_pad_width ?? hole.outer_diameter ?? 0
    const height =
      hole.outer_height ?? hole.rect_pad_height ?? hole.outer_diameter ?? 0
    pushShape(
      shapes,
      hole,
      layer,
      netKey,
      hole.shape === "pill" || hole.shape === "rotated_pill"
        ? makePillShape({ x: hole.x, y: hole.y }, width, height)
        : {
            kind: "rect",
            center: { x: hole.x, y: hole.y },
            width,
            height,
          },
    )
  }
}

const getBrepOuterPoints = (copperPour: CircuitJsonRecord): Point[] =>
  copperPour.brep_shape?.outer_ring?.vertices?.filter(
    (point: unknown) =>
      isRecord(point) &&
      typeof point.x === "number" &&
      typeof point.y === "number",
  ) ?? []

const getBrepInnerRings = (copperPour: CircuitJsonRecord): Point[][] =>
  (copperPour.brep_shape?.inner_rings ?? [])
    .map((ring: CircuitJsonRecord) =>
      ring.vertices?.filter(
        (point: unknown) =>
          isRecord(point) &&
          typeof point.x === "number" &&
          typeof point.y === "number",
      ),
    )
    .filter((ring: unknown) => Array.isArray(ring) && ring.length >= 3)

const collectCopperPourShape = (
  shapes: CopperShape[],
  copperPour: CircuitJsonRecord,
  netKey: string | undefined,
) => {
  const layer = getLayerName(copperPour.layer)
  if (copperPour.shape === "rect") {
    pushShape(shapes, copperPour, layer, netKey, {
      kind: "rect",
      center: copperPour.center,
      width: copperPour.width,
      height: copperPour.height,
    })
    return
  }

  const points =
    copperPour.shape === "polygon"
      ? copperPour.points
      : getBrepOuterPoints(copperPour)
  if (!Array.isArray(points) || points.length < 3) return

  pushShape(shapes, copperPour, layer, netKey, {
    kind: "polygon",
    points,
    holes: copperPour.shape === "brep" ? getBrepInnerRings(copperPour) : [],
  })
}

const collectCopperShapes = (circuitJson: AnyCircuitElement[]) => {
  const netResolver = buildNetResolver(circuitJson)
  const shapes: CopperShape[] = []

  for (const element of circuitJson) {
    if (!isRecord(element)) continue
    const record = element as CircuitJsonRecord
    const netKey = netResolver.getKey(record)
    if (record.type === "pcb_trace") {
      collectTraceShapes(shapes, record, netKey)
    } else if (record.type === "pcb_smtpad") {
      collectPadShape(shapes, record, netKey)
    } else if (record.type === "pcb_via") {
      collectViaShape(shapes, record, netKey)
    } else if (record.type === "pcb_plated_hole") {
      collectPlatedHoleShape(shapes, record, netKey)
    } else if (record.type === "pcb_copper_pour") {
      collectCopperPourShape(shapes, record, netKey)
    }
  }

  return shapes
}

const shapeFromGerberAperture = (
  aperture: CircuitJsonRecord | undefined,
  center: Point,
  rotationDegrees = 0,
): CopperShapeGeometry | undefined => {
  if (!aperture) return undefined
  if (aperture.standard_template_code === "C") {
    return {
      kind: "circle",
      center,
      radius: aperture.diameter / 2,
    }
  }
  if (aperture.standard_template_code === "R") {
    if (rotationDegrees) {
      return makeRotatedRectPolygon(
        center,
        aperture.x_size,
        aperture.y_size,
        rotationDegrees,
      )
    }
    return {
      kind: "rect",
      center,
      width: aperture.x_size,
      height: aperture.y_size,
    }
  }
  if (aperture.standard_template_code === "O") {
    return makePillShape(
      center,
      aperture.x_size,
      aperture.y_size,
      rotationDegrees,
    )
  }
  if (aperture.macro_name === "HORZPILL") {
    return makePillShape(
      center,
      aperture.x_size,
      aperture.y_size,
      rotationDegrees,
    )
  }
  if (aperture.macro_name === "VERTPILL") {
    return makePillShape(
      center,
      aperture.x_size,
      aperture.y_size,
      rotationDegrees + 90,
    )
  }
  return undefined
}

const buildGerberPrimitiveShapes = (
  gerberLayerCmds: Record<string, CircuitJsonRecord[]>,
): GerberPrimitiveShape[] => {
  const shapes: GerberPrimitiveShape[] = []

  for (const [gerberLayerName, commands] of Object.entries(gerberLayerCmds)) {
    const layer = getLayerFromGerberLayerName(gerberLayerName)
    if (!layer) continue

    const apertures = new Map<number, CircuitJsonRecord>()
    const darkShapes: GerberPrimitiveShape[] = []
    const clearPolygons: Point[][] = []
    let selectedAperture: CircuitJsonRecord | undefined
    let currentPoint: Point | undefined
    let currentPointCommandIndex: number | undefined
    let currentPolarity: "D" | "C" = "D"
    let currentRotation = 0
    let regionPoints: Point[] | undefined
    let regionStartIndex: number | undefined
    let currentMetadataNetKey: string | undefined

    const pushGerberShape = (
      geometry: CopperShapeGeometry,
      commandStartIndex: number,
      commandEndIndex: number,
    ) => {
      if (currentPolarity === "C") {
        if (geometry.kind === "polygon") clearPolygons.push(geometry.points)
        return
      }
      darkShapes.push({
        layer,
        geometry,
        commandStartIndex,
        commandEndIndex,
        metadataNetKey: currentMetadataNetKey,
      })
    }

    for (const [commandIndex, command] of commands.entries()) {
      if (command.command_code === "TO" && command.attribute_name === ".N") {
        currentMetadataNetKey = command.attribute_value
        continue
      }
      if (command.command_code === "TD") {
        if (!command.attribute || command.attribute === ".N") {
          currentMetadataNetKey = undefined
        }
        continue
      }
      if (command.command_code === "ADD") {
        apertures.set(command.aperture_number, command)
        continue
      }
      if (command.command_code === "D") {
        selectedAperture = apertures.get(command.aperture_number)
        continue
      }
      if (command.command_code === "LP") {
        currentPolarity = command.polarity
        continue
      }
      if (command.command_code === "LR") {
        currentRotation = command.rotation_degrees
        continue
      }
      if (command.command_code === "G36") {
        regionPoints = []
        regionStartIndex = commandIndex
        continue
      }
      if (command.command_code === "G37") {
        if (regionPoints && regionPoints.length >= 3) {
          pushGerberShape(
            {
              kind: "polygon",
              points: regionPoints,
            },
            regionStartIndex ?? commandIndex,
            commandIndex,
          )
        }
        regionPoints = undefined
        regionStartIndex = undefined
        continue
      }
      if (command.command_code === "D02") {
        currentPoint = { x: command.x, y: command.y }
        currentPointCommandIndex = commandIndex
        if (regionPoints) regionPoints.push(currentPoint)
        continue
      }
      if (command.command_code === "D01") {
        const nextPoint = { x: command.x, y: command.y }
        if (regionPoints) {
          regionPoints.push(nextPoint)
        } else if (
          currentPoint &&
          selectedAperture?.standard_template_code === "C"
        ) {
          pushGerberShape(
            {
              kind: "segment",
              start: currentPoint,
              end: nextPoint,
              radius: selectedAperture.diameter / 2,
            },
            currentPointCommandIndex ?? commandIndex,
            commandIndex,
          )
        }
        currentPoint = nextPoint
        currentPointCommandIndex = commandIndex
        continue
      }
      if (command.command_code === "D03") {
        const geometry = shapeFromGerberAperture(
          selectedAperture,
          { x: command.x, y: command.y },
          currentRotation,
        )
        if (geometry) pushGerberShape(geometry, commandIndex, commandIndex)
      }
    }

    for (const darkShape of darkShapes) {
      const geometry =
        darkShape.geometry.kind === "polygon"
          ? {
              ...darkShape.geometry,
              holes: [
                ...(darkShape.geometry.holes ?? []),
                ...clearPolygons.filter((clearPolygon) =>
                  shapesTouch(darkShape.geometry, {
                    kind: "polygon",
                    points: clearPolygon,
                  }),
                ),
              ],
            }
          : darkShape.geometry
      shapes.push({ ...darkShape, geometry })
    }
  }

  return shapes
}

const tagGerberShapesWithNets = (
  gerberLayerCmds: Record<string, CircuitJsonRecord[]>,
  circuitJson: AnyCircuitElement[],
): GerberCopperShape[] => {
  const circuitShapes = collectCopperShapes(circuitJson)
  return buildGerberPrimitiveShapes(gerberLayerCmds).flatMap(
    (gerberShape): GerberCopperShape[] => {
      const matchingShape = findMatchingCircuitShape(gerberShape, circuitShapes)
      if (!matchingShape) return []
      return [
        {
          ...matchingShape,
          netKey: gerberShape.metadataNetKey ?? matchingShape.netKey,
          gerberGeometry: gerberShape.geometry,
        },
      ]
    },
  )
}

const findMatchingCircuitShape = (
  gerberShape: GerberPrimitiveShape,
  circuitShapes: CopperShape[],
) =>
  circuitShapes
    .filter(
      (circuitShape) =>
        circuitShape.layer === gerberShape.layer &&
        shapesTouch(circuitShape.geometry, gerberShape.geometry),
    )
    .sort((first, second) => {
      const scoreDelta =
        getShapeMatchScore(gerberShape.geometry, first.geometry) -
        getShapeMatchScore(gerberShape.geometry, second.geometry)
      if (Math.abs(scoreDelta) > 1e-9) return scoreDelta
      const areaDelta = shapeArea(first.geometry) - shapeArea(second.geometry)
      if (Math.abs(areaDelta) > 1e-9) return areaDelta
      const gerberCenter = getShapeCenter(gerberShape.geometry)
      const firstCenter = getShapeCenter(first.geometry)
      const secondCenter = getShapeCenter(second.geometry)
      return (
        Math.hypot(
          gerberCenter.x - firstCenter.x,
          gerberCenter.y - firstCenter.y,
        ) -
        Math.hypot(
          gerberCenter.x - secondCenter.x,
          gerberCenter.y - secondCenter.y,
        )
      )
    })[0]

const addNetAttributesToGerberCommands = (
  gerberLayerCmds: Record<string, CircuitJsonRecord[]>,
  circuitJson: AnyCircuitElement[],
) => {
  const circuitShapes = collectCopperShapes(circuitJson)
  const annotatedLayerCmds: Record<string, CircuitJsonRecord[]> = {}

  for (const [gerberLayerName, commands] of Object.entries(gerberLayerCmds)) {
    const primitives = buildGerberPrimitiveShapes({
      [gerberLayerName]: commands,
    })
    const annotationsByStartIndex = new Map<number, CircuitJsonRecord[]>()
    const annotationsByEndIndex = new Map<number, CircuitJsonRecord[]>()

    for (const primitive of primitives) {
      if (primitive.metadataNetKey) continue
      const matchingShape = findMatchingCircuitShape(primitive, circuitShapes)
      if (!matchingShape) continue
      const netAttributeValue = sanitizeGerberAttributeValue(
        matchingShape.netKey,
      )
      const startAnnotations =
        annotationsByStartIndex.get(primitive.commandStartIndex) ?? []
      startAnnotations.push({
        command_code: "TO",
        attribute_name: ".N",
        attribute_value: netAttributeValue,
      })
      annotationsByStartIndex.set(primitive.commandStartIndex, startAnnotations)

      const endAnnotations =
        annotationsByEndIndex.get(primitive.commandEndIndex) ?? []
      endAnnotations.push({
        command_code: "TD",
        attribute: ".N",
      })
      annotationsByEndIndex.set(primitive.commandEndIndex, endAnnotations)
    }

    annotatedLayerCmds[gerberLayerName] = commands.flatMap(
      (command, commandIndex) => [
        ...(annotationsByStartIndex.get(commandIndex) ?? []),
        command,
        ...(annotationsByEndIndex.get(commandIndex) ?? []),
      ],
    )
  }

  return annotatedLayerCmds
}

export const analyzeShorts = (
  circuitJson: AnyCircuitElement[],
  gerberLayerCmds = convertSoupToGerberCommands(circuitJson, {
    flip_y_axis: false,
  }) as Record<string, CircuitJsonRecord[]>,
): ShortCheckIssue[] => {
  const shapes = tagGerberShapesWithNets(gerberLayerCmds, circuitJson)
  const shorts: ShortCheckIssue[] = []
  const seenPairs = new Set<string>()

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const first = shapes[i]
      const second = shapes[j]
      if (first.layer !== second.layer) continue
      if (first.netKey === second.netKey) continue
      if (!shapesTouch(first.gerberGeometry, second.gerberGeometry)) continue

      const pairKey = [first.id, second.id].sort().join("::")
      if (seenPairs.has(pairKey)) continue
      seenPairs.add(pairKey)
      shorts.push({
        layer: first.layer,
        firstId: first.id,
        firstType: first.type,
        firstNetKey: first.netKey,
        secondId: second.id,
        secondType: second.type,
        secondNetKey: second.netKey,
      })
    }
  }

  return shorts
}

const createGerberZip = async (
  circuitJson: AnyCircuitElement[],
  gerberLayerCmds: Record<
    string,
    CircuitJsonRecord[]
  > = convertSoupToGerberCommands(circuitJson, {
    flip_y_axis: false,
  }) as Record<string, CircuitJsonRecord[]>,
) => {
  const zip = new JSZip()
  const gerberFileContents = stringifyGerberCommandLayers(
    gerberLayerCmds as any,
  )
  let gerberFileCount = 0

  for (const [fileName, fileContents] of Object.entries(gerberFileContents)) {
    zip.file(`${fileName}.gbr`, fileContents)
    gerberFileCount++
  }

  const platedDrillCmds = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
    flip_y_axis: false,
  })
  if (platedDrillCmds.length > 0) {
    zip.file("drill.drl", stringifyExcellonDrill(platedDrillCmds))
    gerberFileCount++
  }

  const nonPlatedDrillCmds = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: false,
    flip_y_axis: false,
  })
  if (nonPlatedDrillCmds.length > 0) {
    zip.file("drill_npth.drl", stringifyExcellonDrill(nonPlatedDrillCmds))
    gerberFileCount++
  }

  return {
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
    gerberFileCount,
  }
}

const getDefaultGerberOutputPath = (inputPath: string) => {
  const basename = path.basename(inputPath).replace(/\.[^.]+$/, "")
  return path.join(path.dirname(inputPath), `${basename}-gerbers.zip`)
}

export const checkShort = async (
  file?: string,
  options: { output?: string } = {},
): Promise<ShortCheckResult> => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: false,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })
  const gerberOutputPath = options.output
    ? path.resolve(process.cwd(), options.output)
    : getDefaultGerberOutputPath(resolvedInputFilePath)

  const rawGerberLayerCmds = convertSoupToGerberCommands(circuitJson, {
    flip_y_axis: false,
  })
  const gerberLayerCmds = addNetAttributesToGerberCommands(
    rawGerberLayerCmds as Record<string, CircuitJsonRecord[]>,
    circuitJson,
  )
  const { buffer, gerberFileCount } = await createGerberZip(
    circuitJson,
    gerberLayerCmds,
  )
  await fs.writeFile(gerberOutputPath, buffer)

  const shorts = analyzeShorts(circuitJson, gerberLayerCmds)
  return {
    gerberOutputPath,
    gerberFileCount,
    shortCount: shorts.length,
    shorts,
  }
}

export const formatShortCheckResult = (result: ShortCheckResult) => {
  const lines = [
    `Gerbers: ${result.gerberOutputPath}`,
    `Gerber files: ${result.gerberFileCount}`,
    `Shorts: ${result.shortCount}`,
  ]

  if (result.shorts.length > 0) {
    lines.push(
      ...result.shorts.map(
        (issue) =>
          `- ${issue.layer}: ${issue.firstType} ${issue.firstId} (${issue.firstNetKey}) touches ${issue.secondType} ${issue.secondId} (${issue.secondNetKey})`,
      ),
    )
  }

  return lines.join("\n")
}
