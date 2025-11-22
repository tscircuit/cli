import { plugin, type BunPlugin } from "bun"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import { readFileSync } from "node:fs"

/**
 * Bun plugin that converts .kicad_mod files to Circuit JSON when imported
 */
export const kicadLoaderPlugin: BunPlugin = {
  name: "kicad-loader",
  setup(build) {
    build.onLoad({ filter: /\.kicad_mod$/ }, async (args) => {
      const fileContent = readFileSync(args.path, "utf-8")
      const circuitJson = await parseKicadModToCircuitJson(fileContent)

      // Filter to only footprint soup elements (pcb_smtpad, pcb_plated_hole, etc.)
      const footprintElements = circuitJson.filter(
        (el: any) =>
          el.type === "pcb_smtpad" ||
          el.type === "pcb_plated_hole" ||
          el.type === "pcb_silkscreen_text" ||
          el.type === "pcb_silkscreen_line" ||
          el.type === "pcb_silkscreen_rect" ||
          el.type === "pcb_silkscreen_circle" ||
          el.type === "pcb_silkscreen_path",
      )

      return {
        contents: `export default ${JSON.stringify(footprintElements)};`,
        loader: "js",
      }
    })
  },
}

/**
 * Register the KiCad loader plugin globally for Bun
 */
export function registerKicadLoader() {
  plugin(kicadLoaderPlugin)
}
