import { buildSubtree } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, DrawingPage } from "circuit-json"
import { getCircuitJsonToGltfOptions } from "./get-circuit-json-to-gltf-options"
import { convertModelUrlsToFileUrls } from "../../cli/build/convert-model-urls-to-file-urls"

export const getDrawingPages = (circuitJson: AnyCircuitElement[]) => {
  const pages = circuitJson.filter(
    (e): e is DrawingPage => e.type === "drawing_page",
  )
  return pages.map((page, index) => {
    const stem = (page.name?.trim() || `drawing-${index + 1}`)
      .replace(/\.svg$/i, "")
      .replace(/[^a-zA-Z0-9_.-]+/g, "-")
      .replace(/^\.+|\.+$/g, "")
    return { page, fileName: `${stem || `drawing-${index + 1}`}.svg` }
  })
}

export const selectDrawingPages = (
  circuitJson: AnyCircuitElement[],
  selector?: string,
) => {
  const pages = getDrawingPages(circuitJson)
  const selected = selector
    ? pages.filter(
        ({ page, fileName }) => page.name === selector || fileName === selector,
      )
    : pages
  if (selector && selected.length !== 1) {
    throw new Error(
      selected.length
        ? `Drawing "${selector}" is ambiguous. Use a unique drawing name.`
        : `Drawing "${selector}" not found. Available drawings: ${pages.map(({ page, fileName }) => page.name || fileName).join(", ") || "none"}`,
    )
  }
  const names = selected.map(({ fileName }) => fileName)
  if (new Set(names).size !== names.length)
    throw new Error(
      "Drawing filenames collide. Give each drawing a unique name.",
    )
  return selected
}

/** Input geometry is CAD world mm (+Z up); glTF conversion supplies the drawing
 * renderer's +Y-up frame. Paper-space view placement never transforms the model.
 */
export const renderDrawingPages = async (
  circuitJson: AnyCircuitElement[],
  selector?: string,
) => {
  const pages = selectDrawingPages(circuitJson, selector)
  if (!pages.length) return []
  const { convertCircuitJsonToDrawingPages } = await import(
    "@tscircuit/circuit-json-to-drawing"
  )
  const { convertCircuitJsonToGltf } = await import("circuit-json-to-gltf")
  const { createSceneFromGLTF, loadGLTFWithResourcesFromURL } = await import(
    "poppygl"
  )
  const geometry = convertModelUrlsToFileUrls(
    circuitJson.filter((e) => !e.type.startsWith("drawing_")),
  ) as AnyCircuitElement[]
  const scenes = new Map<string, ReturnType<typeof createSceneFromGLTF>>()
  const rendered = []
  for (const { page, fileName } of pages) {
    const outputs = await convertCircuitJsonToDrawingPages(circuitJson, {
      drawingPageId: page.drawing_page_id,
      resolveScene: async (view) => {
        const key = JSON.stringify([
          view.source_group_id,
          view.source_component_ids,
        ])
        const cached = scenes.get(key)
        if (cached) return cached
        const ids = new Set(view.source_component_ids)
        const selected: AnyCircuitElement[] = view.source_group_id
          ? buildSubtree(geometry, { source_group_id: view.source_group_id })
          : view.source_component_ids
            ? geometry.filter(
                (e) =>
                  (e.type === "source_component" ||
                    e.type === "cad_component") &&
                  ids.has(e.source_component_id),
              )
            : [...geometry]
        if (view.source_group_id) {
          const subcircuits = new Set(
            selected.flatMap((e) =>
              e.type === "source_group" && e.subcircuit_id
                ? [e.subcircuit_id]
                : [],
            ),
          )
          const included = new Set(selected)
          selected.push(
            ...geometry.filter(
              (e) =>
                e.type.startsWith("pcb_") &&
                "subcircuit_id" in e &&
                subcircuits.has(e.subcircuit_id!) &&
                !("pcb_component_id" in e && e.pcb_component_id) &&
                !included.has(e),
            ),
          )
        }
        const glb = await convertCircuitJsonToGltf(selected, {
          ...getCircuitJsonToGltfOptions({ format: "glb" }),
          includeModels: true,
          showBoundingBoxes: false,
        })
        const { gltf, resources } = await loadGLTFWithResourcesFromURL(
          `data:model/gltf-binary;base64,${Buffer.from(glb as ArrayBuffer).toString("base64")}`,
        )
        const scene = createSceneFromGLTF(gltf, resources)
        scenes.set(key, scene)
        return scene
      },
    })
    rendered.push({ fileName, svg: outputs[0]!.svg })
  }
  return rendered
}
