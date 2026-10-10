import type { CircuitJson } from "circuit-json"
import type { jscadToStep } from "jscad-to-step"

type JscadOperation = Parameters<typeof jscadToStep>[0]

export const getAssemblyJscad = (circuitJson: CircuitJson): JscadOperation => {
  const printedParts = circuitJson
    .filter((element) => element.type === "source_component")
    .filter((part) => part.ftype === "printedpart")
  if (printedParts.length === 0) {
    throw new Error("No assembly.printedpart elements found to export")
  }

  const shapes = printedParts.flatMap((part) => {
    const models = circuitJson
      .filter((element) => element.type === "cad_component")
      .filter((model) => model.source_component_id === part.source_component_id)
    if (models.length === 0 || models.some((model) => !model.model_jscad)) {
      throw new Error(
        `Printed part "${part.name}" needs JSCAD geometry for STEP export`,
      )
    }

    return models.map((model): JscadOperation => {
      const origin = model.model_origin_position ?? { x: 0, y: 0, z: 0 }
      const scale = model.model_unit_to_mm_scale_factor ?? 1
      const rotation = model.rotation ?? { x: 0, y: 0, z: 0 }

      return {
        type: "translate",
        vector: [model.position.x, model.position.y, model.position.z],
        shape: {
          type: "rotate",
          angles: [rotation.x, rotation.y, rotation.z].map(
            (angle) => (angle * Math.PI) / 180,
          ),
          shape: {
            type: "scale",
            factors: [scale, scale, scale],
            shape: {
              type: "translate",
              vector: [-origin.x, -origin.y, -origin.z],
              shape: model.model_jscad,
            },
          },
        },
      }
    })
  })

  return shapes.length === 1 ? shapes[0] : { type: "union", shapes }
}
