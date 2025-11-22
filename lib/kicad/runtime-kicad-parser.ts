import { parseKicadModToCircuitJson } from "kicad-component-converter"

/**
 * Runtime parser for .kicad_mod files loaded as text via bunfig.toml
 *
 * This allows users to import .kicad_mod files directly:
 * import footprint from "path/to/file.kicad_mod"
 *
 * The import will give raw text (via bunfig.toml loader),
 * and this function parses it to Circuit JSON.
 */
export async function parseKicadMod(kicadModText: string) {
  const circuitJson = await parseKicadModToCircuitJson(kicadModText)

  // Filter to only footprint soup elements
  return circuitJson.filter(
    (el: any) =>
      el.type === "pcb_smtpad" ||
      el.type === "pcb_plated_hole" ||
      el.type === "pcb_silkscreen_text" ||
      el.type === "pcb_silkscreen_line" ||
      el.type === "pcb_silkscreen_rect" ||
      el.type === "pcb_silkscreen_circle" ||
      el.type === "pcb_silkscreen_path",
  )
}
