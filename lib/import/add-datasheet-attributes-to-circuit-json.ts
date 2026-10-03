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
    const physicalPin =
      element.pin_number !== undefined
        ? String(element.pin_number)
        : /^(?:pin)?\d+$/.test(element.name)
          ? element.name.replace(/^pin/, "")
          : undefined
    const physicalKeys = physicalPin ? [physicalPin, `pin${physicalPin}`] : []
    const physicalAttributes = physicalKeys.map((key) => pinAttributes[key])
    const hasPhysicalAttributes = physicalAttributes.some(
      (attributes) => attributes !== undefined,
    )
    // Physical rows are authoritative, including an explicitly empty row.
    // Only fall back to signal names/hints when no physical row was supplied.
    const candidates = hasPhysicalAttributes
      ? physicalAttributes
      : [...new Set([...(element.port_hints ?? []), element.name])]
          .filter(
            (key) =>
              !physicalPin ||
              !/^(?:pin)?\d+$/.test(key) ||
              key.replace(/^pin/, "") === physicalPin,
          )
          .map((key) => pinAttributes[key])
    const attributes: NonNullable<
      CommonComponentProps["pinAttributes"]
    >[string] = {}
    for (const candidate of candidates) {
      for (const [key, value] of Object.entries(candidate ?? {})) {
        if (value === undefined) continue
        // Conflicting fallback labels cannot safely identify this physical pin.
        if (
          !hasPhysicalAttributes &&
          key in attributes &&
          JSON.stringify(attributes[key as keyof typeof attributes]) !==
            JSON.stringify(value)
        )
          return element
        Object.assign(attributes, { [key]: value })
      }
    }
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
