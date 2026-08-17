import type { AnyCircuitElement } from "circuit-json"

export type PcbViewport = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const normalizeComponentName = (name: string) => name.replace(/^\./, "")

const addPoint = (bounds: PcbViewport, x: number, y: number) => {
  bounds.minX = Math.min(bounds.minX, x)
  bounds.minY = Math.min(bounds.minY, y)
  bounds.maxX = Math.max(bounds.maxX, x)
  bounds.maxY = Math.max(bounds.maxY, y)
}

const addRect = (
  bounds: PcbViewport,
  center: { x: number; y: number },
  width: number,
  height: number,
  rotation = 0,
) => {
  const radians = (rotation * Math.PI) / 180
  const halfWidth = width / 2
  const halfHeight = height / 2
  const rotatedHalfWidth =
    Math.abs(Math.cos(radians)) * halfWidth +
    Math.abs(Math.sin(radians)) * halfHeight
  const rotatedHalfHeight =
    Math.abs(Math.sin(radians)) * halfWidth +
    Math.abs(Math.cos(radians)) * halfHeight

  addPoint(bounds, center.x - rotatedHalfWidth, center.y - rotatedHalfHeight)
  addPoint(bounds, center.x + rotatedHalfWidth, center.y + rotatedHalfHeight)
}

export const getComponentPcbViewport = (
  circuitJson: AnyCircuitElement[],
  requestedComponentName: string,
): PcbViewport => {
  const componentName = normalizeComponentName(requestedComponentName)
  const sourceComponent = circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      normalizeComponentName(element.name) === componentName,
  )

  if (!sourceComponent || sourceComponent.type !== "source_component") {
    throw new Error(
      `Could not find component named "${requestedComponentName}"`,
    )
  }

  const pcbComponent = circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === sourceComponent.source_component_id,
  )

  if (!pcbComponent || pcbComponent.type !== "pcb_component") {
    throw new Error(
      `Component "${requestedComponentName}" does not have a PCB component`,
    )
  }

  const bounds: PcbViewport = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }

  addRect(
    bounds,
    pcbComponent.center,
    pcbComponent.width,
    pcbComponent.height,
    pcbComponent.rotation,
  )

  for (const element of circuitJson) {
    if (
      !("pcb_component_id" in element) ||
      element.pcb_component_id !== pcbComponent.pcb_component_id
    ) {
      continue
    }

    if (element.type === "pcb_courtyard_rect") {
      addRect(
        bounds,
        element.center,
        element.width,
        element.height,
        element.ccw_rotation,
      )
    } else if (
      element.type === "pcb_courtyard_outline" ||
      element.type === "pcb_courtyard_polygon"
    ) {
      const points =
        element.type === "pcb_courtyard_outline"
          ? element.outline
          : element.points
      for (const point of points) addPoint(bounds, point.x, point.y)
    } else if (element.type === "pcb_courtyard_circle") {
      addRect(bounds, element.center, element.radius * 2, element.radius * 2)
    } else if (element.type === "pcb_courtyard_pill") {
      addRect(bounds, element.center, element.width, element.height)
    }
  }

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const padding = Math.max(0.5, Math.max(width, height) * 0.1)

  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  }
}
