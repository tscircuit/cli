import { basename, extname } from "node:path"
import { findFootprinterCandidates } from "../find-footprinter-candidates"
import { loadFootprintForInspection } from "../footprint/load-footprint-for-inspection"
import { findEquivalentModel, getMeshBounds } from "./find-equivalent-model"
import { loadModel } from "./load-model"

export async function inspectModel(
  input: string,
  options: { footprint?: string; unitToMm: string },
) {
  const scale = Number(options.unitToMm)
  if (!Number.isFinite(scale) || scale <= 0)
    throw new Error("--unit-to-mm must be a positive number")
  const { mesh, footprint, modelString } = await loadModel(input, scale)
  const source = options.footprint
    ? await loadFootprintForInspection(options.footprint)
    : footprint
  const hints = [
    modelString,
    source?.declaredFootprinterString,
    basename(input, extname(input)),
  ].filter((s): s is string => !!s)
  if (source && !source.declaredFootprinterString) {
    hints.push(
      ...findFootprinterCandidates(source).map((c) => c.footprinterString),
    )
  }
  const boundsMm = getMeshBounds(mesh)
  return {
    input,
    boundsMm,
    triangleCount: mesh.indices.length / 3,
    ...(await findEquivalentModel(mesh, hints)),
  }
}

export function formatModelInspection(
  result: Awaited<ReturnType<typeof inspectModel>>,
) {
  const match = result.equivalentFootprinter
  return [
    result.input,
    `size: ${result.boundsMm.size.map((v) => Number(v.toFixed(4))).join(" x ")} mm (X x Y x Z)`,
    `triangles: ${result.triangleCount}`,
    ...(result.volumeMm3 === null
      ? []
      : [`volume: ${Number(result.volumeMm3.toFixed(4))} mm³`]),
    match
      ? `equivalent model: ${match.footprinterString} (volume IoU ${(match.volumeIntersectionOverUnion * 100).toFixed(2)}%, Z rotation ${match.rotationDegrees}°)`
      : `equivalent model: ${result.searchNote ?? "no match above 80% volume IoU"}`,
  ].join("\n")
}
