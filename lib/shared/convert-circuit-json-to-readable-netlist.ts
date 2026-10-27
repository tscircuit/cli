import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { convertCircuitJsonToReadableNetlist as upstreamConvertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"

type ComponentPinsHeader = string

const POLARITY_PORT_HINTS = new Set(["anode", "cathode"])

/**
 * Core gives resistors, inductors and capacitors "anode"/"cathode" port hints,
 * and the readable netlist lists every port hint as a pin alias. Those aliases
 * only make sense for polarized parts (diodes, LEDs, batteries, polarized
 * capacitors), so drop them from parts whose pins are interchangeable and keep
 * the other hints (pos/neg, left/right).
 */
const removePolarityHintsFromInterchangeablePins = (
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] => {
  const interchangeablePinComponentIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_component" && element.are_pins_interchangeable
        ? [element.source_component_id]
        : [],
    ),
  )

  return circuitJson.map((element) => {
    if (
      element.type !== "source_port" ||
      !element.port_hints ||
      !element.source_component_id ||
      !interchangeablePinComponentIds.has(element.source_component_id)
    ) {
      return element
    }
    return {
      ...element,
      port_hints: element.port_hints.filter(
        (hint) => !POLARITY_PORT_HINTS.has(hint),
      ),
    }
  })
}

/**
 * The COMPONENT_PINS header for resistors and capacitors is built as
 * `${name} (${display_resistance} ${footprinter_string})`, which prints
 * "R1 (1kΩ undefined)" when there is no footprinter string: `tsci check
 * netlist` skips the PCB render (so there is no cad_component), and custom
 * footprints have none. Rewrite exactly those header lines without the
 * footprint, like the COMPONENTS section already does.
 */
const removeUndefinedFromComponentPinHeaders = (
  readableNetlist: string,
  circuitJson: AnyCircuitElement[],
): string => {
  const fixedHeaders = new Map<ComponentPinsHeader, ComponentPinsHeader>()

  for (const component of circuitJson) {
    if (component.type !== "source_component") continue

    let displayResistanceOrCapacitance: string | undefined
    if (component.ftype === "simple_resistor") {
      displayResistanceOrCapacitance = component.display_resistance
    } else if (component.ftype === "simple_capacitor") {
      displayResistanceOrCapacitance = component.display_capacitance
    } else {
      continue
    }

    const footprinterString = circuitJson.find(
      (element): element is CadComponent =>
        element.type === "cad_component" &&
        element.source_component_id === component.source_component_id,
    )?.footprinter_string
    if (footprinterString) continue

    fixedHeaders.set(
      `${component.name} (${displayResistanceOrCapacitance} ${footprinterString})`,
      `${component.name} (${displayResistanceOrCapacitance})`,
    )
  }

  if (fixedHeaders.size === 0) return readableNetlist

  return readableNetlist
    .split("\n")
    .map((line) => fixedHeaders.get(line) ?? line)
    .join("\n")
}

/**
 * Wraps circuit-json-to-readable-netlist so every CLI command prints the same
 * netlist without polarity aliases on non-polarized parts or "undefined"
 * footprints. Both fixes become no-ops once the upstream output is corrected.
 */
export const convertCircuitJsonToReadableNetlist = (
  circuitJson: AnyCircuitElement[],
): string => {
  const readableNetlist = upstreamConvertCircuitJsonToReadableNetlist(
    removePolarityHintsFromInterchangeablePins(circuitJson),
  )
  return removeUndefinedFromComponentPinHeaders(readableNetlist, circuitJson)
}
