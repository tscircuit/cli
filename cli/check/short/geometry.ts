import {
  doBoundsOverlap,
  doSegmentsIntersect,
  distSq,
  getBoundFromCenteredRect,
  isPointInsideBounds,
  isPointInsidePolygon,
  pointToSegmentDistance,
  segmentToBoundsMinDistance,
  segmentToSegmentMinDistance,
  type Point,
} from "@tscircuit/math-utils"

export type { Point }

export type CircleShape = {
  kind: "circle"
  center: Point
  radius: number
}

export type SegmentShape = {
  kind: "segment"
  start: Point
  end: Point
  radius: number
}

export type RectShape = {
  kind: "rect"
  center: Point
  width: number
  height: number
}

export type PolygonShape = {
  kind: "polygon"
  points: Point[]
  holes?: Point[][]
}

export type CopperShapeGeometry =
  | CircleShape
  | SegmentShape
  | RectShape
  | PolygonShape

const rectBounds = (rect: RectShape) =>
  getBoundFromCenteredRect({
    center: rect.center,
    width: rect.width,
    height: rect.height,
  })

const rectsTouch = (first: RectShape, second: RectShape) => {
  return doBoundsOverlap(rectBounds(first), rectBounds(second))
}

const circleTouchesRect = (circle: CircleShape, rect: RectShape) => {
  const bounds = rectBounds(rect)
  const closestX = Math.max(bounds.minX, Math.min(circle.center.x, bounds.maxX))
  const closestY = Math.max(bounds.minY, Math.min(circle.center.y, bounds.maxY))
  return (
    distSq(circle.center, { x: closestX, y: closestY }) <= circle.radius ** 2
  )
}

const segmentTouchesRect = (segment: SegmentShape, rect: RectShape) => {
  return (
    segmentToBoundsMinDistance(segment.start, segment.end, rectBounds(rect)) <=
    segment.radius
  )
}

const ringEdges = (points: Point[]) =>
  points.map((point, index) => ({
    start: point,
    end: points[(index + 1) % points.length],
  }))

const pointInPolygon = (point: Point, polygon: PolygonShape) =>
  isPointInsidePolygon(point, polygon.points) &&
  !(polygon.holes ?? []).some((hole) => isPointInsidePolygon(point, hole))

const polygonBoundaryEdges = (polygon: PolygonShape) =>
  ringEdges(polygon.points)

const rectCorners = (rect: RectShape) => {
  const bounds = rectBounds(rect)
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
}

const pointInRect = (point: Point, rect: RectShape) =>
  isPointInsideBounds(point, rectBounds(rect))

const rotatePoint = (point: Point, center: Point, ccwRotation = 0): Point => {
  const radians = (ccwRotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export const makeRotatedRectPolygon = (
  center: Point,
  width: number,
  height: number,
  ccwRotation = 0,
): PolygonShape => {
  const halfWidth = width / 2
  const halfHeight = height / 2
  return {
    kind: "polygon",
    points: [
      { x: center.x - halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y + halfHeight },
      { x: center.x - halfWidth, y: center.y + halfHeight },
    ].map((point) => rotatePoint(point, center, ccwRotation)),
  }
}

export const makePillShape = (
  center: Point,
  width: number,
  height: number,
  ccwRotation = 0,
): CircleShape | SegmentShape => {
  const radius = Math.min(width, height) / 2
  const longAxis = Math.max(width, height)
  const endpointOffset = Math.max(0, longAxis / 2 - radius)
  if (endpointOffset === 0) {
    return { kind: "circle", center, radius }
  }

  const isHorizontal = width >= height
  const localStart = {
    x: center.x + (isHorizontal ? -endpointOffset : 0),
    y: center.y + (isHorizontal ? 0 : -endpointOffset),
  }
  const localEnd = {
    x: center.x + (isHorizontal ? endpointOffset : 0),
    y: center.y + (isHorizontal ? 0 : endpointOffset),
  }

  return {
    kind: "segment",
    start: rotatePoint(localStart, center, ccwRotation),
    end: rotatePoint(localEnd, center, ccwRotation),
    radius,
  }
}

const segmentTouchesPolygon = (
  segment: SegmentShape,
  polygon: PolygonShape,
) => {
  if (
    pointInPolygon(segment.start, polygon) ||
    pointInPolygon(segment.end, polygon)
  ) {
    return true
  }

  return polygonBoundaryEdges(polygon).some(
    ({ start, end }) =>
      segmentToSegmentMinDistance(segment.start, segment.end, start, end) <=
      segment.radius,
  )
}

const circleTouchesPolygon = (circle: CircleShape, polygon: PolygonShape) => {
  if (pointInPolygon(circle.center, polygon)) return true

  return polygonBoundaryEdges(polygon).some(
    ({ start, end }) =>
      pointToSegmentDistance(circle.center, start, end) <= circle.radius,
  )
}

const rectTouchesPolygon = (rect: RectShape, polygon: PolygonShape) => {
  const corners = rectCorners(rect)
  if (
    corners.some((corner) => pointInPolygon(corner, polygon)) ||
    polygon.points.some((point) => pointInRect(point, rect))
  ) {
    return true
  }

  return corners.some((corner, index) =>
    polygonBoundaryEdges(polygon).some(({ start, end }) =>
      doSegmentsIntersect(
        corner,
        corners[(index + 1) % corners.length],
        start,
        end,
      ),
    ),
  )
}

const polygonsTouch = (first: PolygonShape, second: PolygonShape) => {
  if (
    first.points.some((point) => pointInPolygon(point, second)) ||
    second.points.some((point) => pointInPolygon(point, first))
  ) {
    return true
  }

  return polygonBoundaryEdges(first).some((firstEdge) =>
    polygonBoundaryEdges(second).some((secondEdge) =>
      doSegmentsIntersect(
        firstEdge.start,
        firstEdge.end,
        secondEdge.start,
        secondEdge.end,
      ),
    ),
  )
}

export const shapesTouch = (
  first: CopperShapeGeometry,
  second: CopperShapeGeometry,
): boolean => {
  if (first.kind === "circle" && second.kind === "circle") {
    return (
      distSq(first.center, second.center) <= (first.radius + second.radius) ** 2
    )
  }
  if (first.kind === "segment" && second.kind === "segment") {
    return (
      segmentToSegmentMinDistance(
        first.start,
        first.end,
        second.start,
        second.end,
      ) <=
      first.radius + second.radius
    )
  }
  if (first.kind === "circle" && second.kind === "segment") {
    return (
      pointToSegmentDistance(first.center, second.start, second.end) <=
      first.radius + second.radius
    )
  }
  if (first.kind === "segment" && second.kind === "circle") {
    return shapesTouch(second, first)
  }
  if (first.kind === "rect" && second.kind === "rect") {
    return rectsTouch(first, second)
  }
  if (first.kind === "circle" && second.kind === "rect") {
    return circleTouchesRect(first, second)
  }
  if (first.kind === "rect" && second.kind === "circle") {
    return shapesTouch(second, first)
  }
  if (first.kind === "segment" && second.kind === "rect") {
    return segmentTouchesRect(first, second)
  }
  if (first.kind === "polygon" && second.kind === "polygon") {
    return polygonsTouch(first, second)
  }
  if (first.kind === "circle" && second.kind === "polygon") {
    return circleTouchesPolygon(first, second)
  }
  if (first.kind === "polygon" && second.kind === "circle") {
    return shapesTouch(second, first)
  }
  if (first.kind === "segment" && second.kind === "polygon") {
    return segmentTouchesPolygon(first, second)
  }
  if (first.kind === "polygon" && second.kind === "segment") {
    return shapesTouch(second, first)
  }
  if (first.kind === "rect" && second.kind === "polygon") {
    return rectTouchesPolygon(first, second)
  }
  if (first.kind === "polygon" && second.kind === "rect") {
    return shapesTouch(second, first)
  }
  return shapesTouch(second, first)
}
