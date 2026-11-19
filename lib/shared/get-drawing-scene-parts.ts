import { createBoardOwnerMap, getElementId } from "@tscircuit/circuit-json-util"
import type { DrawingScenePart } from "@tscircuit/circuit-json-to-drawing"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import {
  type Box3D,
  convertCircuitJsonTo3D,
  convertSceneToGLTF,
} from "circuit-json-to-gltf"
import { mat4 } from "gl-matrix"
import { createSceneFromGLTF, loadGLTFWithResourcesFromURL } from "poppygl"
import { getCircuitJsonToGltfOptions } from "./get-circuit-json-to-gltf-options"

type SourceComponentId = CadComponent["source_component_id"]

// GLB geometry uses (-x, z, y), while drawing offsets use (x, z, -y).
const glbToDrawingFrame = mat4.fromYRotation(mat4.create(), Math.PI)

async function boxesToDrawingDrawCalls(boxes: Box3D[]) {
  const glb = await convertSceneToGLTF({ boxes }, { binary: true })
  if (!(glb instanceof ArrayBuffer)) {
    throw new Error("Expected binary glTF for drawing geometry")
  }
  const { gltf, resources } = await loadGLTFWithResourcesFromURL(
    `data:model/gltf-binary;base64,${Buffer.from(glb).toString("base64")}`,
  )
  return createSceneFromGLTF(gltf, resources).drawCalls.map((call) => ({
    ...call,
    model: mat4.multiply(mat4.create(), glbToDrawingFrame, call.model),
  }))
}

export async function getDrawingSceneParts(geometry: AnyCircuitElement[]) {
  const { projectBaseUrl, authHeaders } = getCircuitJsonToGltfOptions({})
  const cadComponents = geometry.filter(
    (element) => element.type === "cad_component",
  )
  const sceneOptions = {
    projectBaseUrl,
    authHeaders,
    foldPcbs: cadComponents.some(
      (component) => component.is_on_folded_board === true,
    ),
  }
  const parts: DrawingScenePart[] = []
  if (cadComponents.length) {
    const scene = await convertCircuitJsonTo3D(geometry, {
      ...sceneOptions,
      renderBoardTextures: false,
    })
    const boxesBySource = new Map<SourceComponentId, Box3D[]>()
    for (const box of scene.boxes) {
      const sourceId = box.componentMetadata?.source_component_id
      if (!sourceId) continue
      const boxes = boxesBySource.get(sourceId) ?? []
      boxes.push(box)
      boxesBySource.set(sourceId, boxes)
    }
    for (const [source_component_id, boxes] of boxesBySource) {
      const drawCalls = await boxesToDrawingDrawCalls(boxes)
      if (drawCalls.length) parts.push({ source_component_id, drawCalls })
    }
  }

  // Board meshes have no component metadata, so render each board with its own PCB elements.
  const boards = geometry.filter((element) => element.type === "pcb_board")
  const boardOwners = createBoardOwnerMap(geometry)
  for (const board of boards) {
    const pcbElements = geometry.filter((element) => {
      if (!element.type.startsWith("pcb_") || element.type === "pcb_panel")
        return false
      if ("pcb_board_id" in element && element.pcb_board_id) {
        return element.pcb_board_id === board.pcb_board_id
      }
      if (boards.length === 1) return true
      let owner = boardOwners.get(getElementId(element))
      if (!owner && "pcb_component_id" in element && element.pcb_component_id) {
        owner = boardOwners.get(element.pcb_component_id)
      }
      if (!owner && "pcb_group_id" in element && element.pcb_group_id) {
        owner = boardOwners.get(element.pcb_group_id)
      }
      if (!owner && "subcircuit_id" in element && element.subcircuit_id) {
        owner = boardOwners.get(element.subcircuit_id)
      }
      return owner?.pcb_board_id === board.pcb_board_id
    })
    const { boxes } = await convertCircuitJsonTo3D(pcbElements, sceneOptions)
    const drawCalls = await boxesToDrawingDrawCalls(boxes)
    if (drawCalls.length)
      parts.push({ pcb_board_id: board.pcb_board_id, drawCalls })
  }
  return parts
}
