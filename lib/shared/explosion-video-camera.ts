import { vec3 } from "gl-matrix"
import type { RenderOptionsInput } from "poppygl"

/** Fit all translation endpoints, in glTF world millimetres (+Y up).
 * The fixed orthographic camera prevents zooming/recentering between stages.
 * Linear movement cannot leave the union of its endpoint bounds.
 */
export const getExplosionVideoCamera = (
  bounds: { min: number[]; max: number[] },
  aspect: number,
): RenderOptionsInput => {
  const target = bounds.min.map((v, i) => (v + bounds.max[i]) / 2)
  const direction = vec3.normalize(vec3.create(), [-0.7, 0.65, -1])
  const right = vec3.normalize(
    vec3.create(),
    vec3.cross(vec3.create(), [0, 1, 0], direction),
  )
  const up = vec3.cross(vec3.create(), direction, right)
  let halfWidth = 0
  let halfHeight = 0
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const offset = [x - target[0], y - target[1], z - target[2]]
        halfWidth = Math.max(halfWidth, Math.abs(vec3.dot(offset, right)))
        halfHeight = Math.max(halfHeight, Math.abs(vec3.dot(offset, up)))
      }
    }
  }
  const distance =
    Math.max(1, Math.hypot(...bounds.max.map((v, i) => v - bounds.min[i]))) * 2
  return {
    projection: "orthographic",
    orthographicHeight:
      Math.max(1, 2 * Math.max(halfHeight, halfWidth / aspect)) * 1.12,
    camPos: target.map((v, i) => v + direction[i] * distance) as [
      number,
      number,
      number,
    ],
    lookAt: target as [number, number, number],
    up: "y+",
  }
}
