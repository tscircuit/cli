import { analyzePcbPin1Location } from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import {
  type AnyCircuitElement,
  getRotationBetweenPcbPin1Locations,
} from "circuit-json"

/** Enrich a prebuilt circuit without rendering or changing its copper geometry. */
export async function enrichFabricationOrientation(
  circuitJson: AnyCircuitElement[],
  platform: PlatformConfig,
  warn: (message: string) => void = console.warn,
): Promise<AnyCircuitElement[]> {
  const json = structuredClone(circuitJson)
  const sources = new Map(
    json
      .filter((e) => e.type === "source_component")
      .map((e) => [e.source_component_id, e]),
  )
  const supplierFrames = new Map<
    string,
    ReturnType<typeof analyzePcbPin1Location>
  >()
  for (const component of json) {
    if (component.type !== "pcb_component" || component.do_not_place) continue
    const source = sources.get(component.source_component_id)
    if (!source || source.ftype === "simple_test_point") continue
    const part = source.supplier_part_numbers?.jlcpcb?.[0]
    // No JLCPCB placement is requested for components with no supplier part.
    if (!part) continue
    const unresolved = (reason: string) =>
      warn(
        `JLCPCB orientation unresolved for ${source.name} (${part}): ${reason}. Verify its CPL rotation before assembly.`,
      )
    if (!component.pin1_location) {
      // Serialized JSON does not retain the footprint's original layer. Do not
      // guess whether bottom-side pads were mirrored during placement.
      if (component.layer === "bottom") {
        unresolved(
          "bottom-side footprint needs explicit pin1_location metadata",
        )
        continue
      }
      const angle = (-component.rotation * Math.PI) / 180
      const toLocal = ({ x, y }: { x: number; y: number }) => {
        const dx = x - component.center.x,
          dy = y - component.center.y
        return {
          x: dx * Math.cos(angle) - dy * Math.sin(angle),
          y: dx * Math.sin(angle) + dy * Math.cos(angle),
        }
      }
      const pads = json
        .filter(
          (e) =>
            (e.type === "pcb_smtpad" || e.type === "pcb_plated_hole") &&
            e.pcb_component_id === component.pcb_component_id,
        )
        .map((e) => {
          const pad = structuredClone(e) as AnyCircuitElement & {
            x?: number
            y?: number
            points?: { x: number; y: number }[]
          }
          if (typeof pad.x === "number" && typeof pad.y === "number")
            Object.assign(pad, toLocal({ x: pad.x, y: pad.y }))
          if (pad.points) pad.points = pad.points.map(toLocal)
          return pad
        })
      const local = analyzePcbPin1Location(pads)
      if (!local) {
        unresolved("cannot identify the authored pin-1 frame")
        continue
      }
      component.pin1_location = local
    }
    if (!component.supplier_pin1_location_map?.jlcpcb) {
      try {
        if (!supplierFrames.has(part)) {
          if (!platform.partsEngine?.fetchPartCircuitJson)
            throw new Error("parts engine cannot fetch supplier footprints")
          const supplierJson = await platform.partsEngine.fetchPartCircuitJson({
            supplierPartNumber: part,
            platformFetch: platform.platformFetch,
          })
          supplierFrames.set(
            part,
            supplierJson?.length ? analyzePcbPin1Location(supplierJson) : null,
          )
        }
        const frame = supplierFrames.get(part)
        if (!frame) {
          unresolved("cannot identify the supplier pin-1 frame")
          continue
        }
        component.supplier_pin1_location_map = {
          ...component.supplier_pin1_location_map,
          jlcpcb: frame,
        }
      } catch (error) {
        unresolved(
          error instanceof Error ? error.message : "supplier lookup failed",
        )
        continue
      }
    }
    if (
      getRotationBetweenPcbPin1Locations(
        component.supplier_pin1_location_map.jlcpcb!,
        component.pin1_location,
      ) === null
    ) {
      unresolved("authored and supplier frames cannot be matched by rotation")
    }
  }
  return json
}
