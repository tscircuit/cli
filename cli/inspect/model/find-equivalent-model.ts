import {
  getFootprintNamesByType,
  getFootprintSizes,
} from "@tscircuit/footprinter"
import type { CadComponentMesh } from "circuit-json-to-gltf"
import type { Manifold, ManifoldToplevel, Vec3 } from "manifold-3d"
import { isFootprinterString } from "lib/shared/is-footprinter-string"
import { loadFootprinterMesh } from "./load-model"

const minimumIoU = 0.8

function* catalogStrings() {
  const { passiveFootprintNames, normalFootprintNames } =
    getFootprintNamesByType()
  for (const { imperial } of getFootprintSizes()) {
    for (const family of passiveFootprintNames) yield family + imperial
  }
  yield* normalFootprintNames
  for (const family of ["soic", "tssop", "dip", "pinrow"]) {
    for (const pins of [2, 4, 6, 8, 10, 14, 16, 20, 24, 28, 32])
      yield family + pins
  }
}

export function getMeshBounds({ positions }: CadComponentMesh) {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i++) {
    const value = positions[i]!
    if (!Number.isFinite(value))
      throw new Error("Model contains a non-finite position")
    const axis = i % 3
    min[axis] = Math.min(min[axis]!, value)
    max[axis] = Math.max(max[axis]!, value)
  }
  return { min, max, size: max.map((v, i) => v - min[i]!) }
}

// Center both solids and keep their millimetre dimensions. Renderer meshes may
// contain overlapping body and lead shells; union them before measuring volume.
function centeredSolid(m: ManifoldToplevel, mesh: CadComponentMesh) {
  const data = new m.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(mesh.positions),
    triVerts: new Uint32Array(mesh.indices),
  })
  data.merge()
  let raw: Manifold
  try {
    raw = new m.Manifold(data)
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "NotManifold"
    )
      return null
    throw error
  }
  try {
    if (raw.status() !== "NoError" || !(raw.volume() > 0)) return null
    const shells = raw.decompose()
    try {
      // Keep inward-facing shells with their solid so cavities stay empty.
      const solid = shells.every((part) => part.volume() > 0)
        ? m.Manifold.union(shells)
        : raw
      try {
        const { min, max } = solid.boundingBox()
        return solid.translate([
          -(min[0] + max[0]) / 2,
          -(min[1] + max[1]) / 2,
          -(min[2] + max[2]) / 2,
        ])
      } finally {
        if (solid !== raw) solid.delete()
      }
    } finally {
      for (const shell of shells) shell.delete()
    }
  } finally {
    raw.delete()
  }
}

type ModelMatch = {
  footprinterString: string
  volumeIntersectionOverUnion: number
  rotationDegrees: number
}

function compareCandidate(
  target: Manifold,
  candidate: Manifold,
  footprinterString: string,
  best: ModelMatch | null,
) {
  const a = target.volume()
  const b = candidate.volume()
  if (
    Math.min(a, b) / Math.max(a, b) <=
    (best?.volumeIntersectionOverUnion ?? minimumIoU)
  )
    return best
  for (const rotationDegrees of [0, 90, 180, 270]) {
    const rotated = candidate.rotate([0, 0, rotationDegrees])
    try {
      const overlap = target.intersect(rotated)
      try {
        if (overlap.status() !== "NoError") continue
        const intersection = Math.max(0, Math.min(a, b, overlap.volume()))
        const iou = intersection / (a + b - intersection)
        if (iou > (best?.volumeIntersectionOverUnion ?? minimumIoU)) {
          best = {
            footprinterString,
            volumeIntersectionOverUnion: iou,
            rotationDegrees,
          }
          if (iou >= 1 - 1e-8) break
        }
      } finally {
        overlap.delete()
      }
    } finally {
      rotated.delete()
    }
  }
  return best
}

export async function findEquivalentModel(
  mesh: CadComponentMesh,
  hints: string[],
) {
  const { default: Module } = await import("manifold-3d")
  const m = await Module()
  m.setup()
  const target = centeredSolid(m, mesh)
  if (!target)
    return {
      volumeMm3: null,
      equivalentFootprinter: null,
      searchNote: "Volume comparison requires a closed, outward-oriented solid",
    }
  try {
    let best: ModelMatch | null = null
    for (const name of new Set([...hints, ...catalogStrings()])) {
      if (!isFootprinterString(name)) continue
      let candidateMesh: CadComponentMesh
      try {
        candidateMesh = await loadFootprinterMesh(name)
      } catch (error) {
        // Some footprints only define copper and have no 3D geometry.
        if (
          error instanceof Error &&
          error.message.startsWith("No triangle mesh available")
        )
          continue
        throw error
      }
      const candidate = centeredSolid(m, candidateMesh)
      if (!candidate) continue
      try {
        best = compareCandidate(target, candidate, name, best)
        if (best && best.volumeIntersectionOverUnion >= 1 - 1e-8) break
      } finally {
        candidate.delete()
      }
    }
    return { volumeMm3: target.volume(), equivalentFootprinter: best }
  } finally {
    target.delete()
  }
}
