import type { CommonComponentProps } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

/** Apply validated props attributes to the source ports of one imported part. */
export const addDatasheetAttributesToCircuitJson = (
  circuitJson: AnyCircuitElement[],
  pinAttributes: NonNullable<CommonComponentProps["pinAttributes"]>,
): AnyCircuitElement[] => {
  const components = circuitJson.filter(
    (element) => element.type === "source_component",
  )
  if (components.length !== 1) return circuitJson
  return circuitJson.map((element) => {
    if (
      element.type !== "source_port" ||
      element.source_component_id !== components[0]!.source_component_id
    )
      return element
    const pinKey =
      element.pin_number !== undefined
        ? `pin${element.pin_number}`
        : element.name
    const keys = new Set([...(element.port_hints ?? []), element.name])
    keys.delete(pinKey)
    keys.add(pinKey)
    // An explicit physical-pin entry takes precedence over shared signal labels.
    const attributes = Object.assign(
      {},
      ...[...keys].map((key) => pinAttributes[key]),
    ) as NonNullable<CommonComponentProps["pinAttributes"]>[string]
    const sourceAttributes: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(attributes)) {
      if (value === undefined) continue
      if (
        key === "capabilities" ||
        key === "activeCapabilities" ||
        key === "activeCapability"
      ) {
        const prefix =
          key === "capabilities" ? "supports_" : "is_configured_for_"
        for (const capability of Array.isArray(value) ? value : [value]) {
          sourceAttributes[`${prefix}${capability}`] = true
        }
      } else {
        sourceAttributes[
          key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        ] = value
      }
    }
    return { ...element, ...sourceAttributes }
  })
}
