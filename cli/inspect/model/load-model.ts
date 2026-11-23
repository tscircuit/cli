import type { CadComponent } from "circuit-json"
import { loadCadComponentMesh } from "circuit-json-to-gltf"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { loadFootprintForInspection } from "../footprint/load-footprint-for-inspection"

const modelKeys = {
  ".glb": "model_glb_url",
  ".gltf": "model_gltf_url",
  ".obj": "model_obj_url",
  ".stl": "model_stl_url",
  ".step": "model_step_url",
  ".stp": "model_step_url",
} as const

const component: CadComponent = {
  type: "cad_component",
  cad_component_id: "inspect_model",
  source_component_id: "inspect_model",
  position: { x: 0, y: 0, z: 0 },
  model_object_fit: "contain_within_bounds",
  anchor_alignment: "center",
}

export const loadFootprinterMesh = (footprinterString: string) =>
  loadCadComponentMesh({ ...component, footprinter_string: footprinterString })

export async function loadModel(input: string, scale: number) {
  const ext = path.extname(input).toLowerCase() as keyof typeof modelKeys
  const modelKey = modelKeys[ext]
  if (modelKey) {
    if (!fs.existsSync(input)) throw new Error(`File not found: ${input}`)
    const mesh = await loadCadComponentMesh({
      ...component,
      [modelKey]: pathToFileURL(path.resolve(input)).href,
      model_unit_to_mm_scale_factor: scale,
    })
    return { mesh }
  }
  if (scale !== 1)
    throw new Error("--unit-to-mm applies to standalone model files")
  const footprint = await loadFootprintForInspection(input)
  if (footprint.kind === "footprinter_string") {
    return { mesh: await loadFootprinterMesh(input), footprint }
  }
  const models = footprint.circuitJson.filter((e) => e.type === "cad_component")
  if (
    models.length !== 1 ||
    footprint.circuitJson.filter((e) => e.type === "pcb_component").length > 1
  ) {
    throw new Error(
      `Expected a single component with one CAD model, found ${models.length} CAD models`,
    )
  }
  const cad = models[0]!
  const mesh = await loadCadComponentMesh(cad, {
    projectBaseUrl: pathToFileURL(path.dirname(path.resolve(input)) + path.sep)
      .href,
  })
  return { mesh, footprint, modelString: cad.footprinter_string }
}
