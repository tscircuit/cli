import type { AnyCircuitElement, PcbComponent } from "circuit-json"

type SourceComponent = Extract<AnyCircuitElement, { type: "source_component" }>

export type PcbViewport = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const DEFAULT_PCB_COMPONENT_PADDING_MM = 2

export const getPcbComponentViewport = (
  circuitJson: AnyCircuitElement[],
  componentName: string,
  padding = DEFAULT_PCB_COMPONENT_PADDING_MM,
): PcbViewport => {
  const sourceComponents = circuitJson.filter(
    (element): element is SourceComponent =>
      element.type === "source_component",
  )
  const sourceComponentIds = new Set(
    sourceComponents
      .filter((component) => component.name === componentName)
      .map((component) => component.source_component_id),
  )
  const matchingPcbComponents = circuitJson.filter(
    (element): element is PcbComponent =>
      element.type === "pcb_component" &&
      sourceComponentIds.has(element.source_component_id),
  )

  if (matchingPcbComponents.length === 0) {
    const availableComponentNames = sourceComponents
      .filter((sourceComponent) =>
        circuitJson.some(
          (element) =>
            element.type === "pcb_component" &&
            element.source_component_id === sourceComponent.source_component_id,
        ),
      )
      .map((component) => component.name)
      .sort()

    const availableComponentsMessage =
      availableComponentNames.length > 0
        ? ` Available PCB components: ${availableComponentNames.join(", ")}.`
        : ""

    throw new Error(
      `PCB component "${componentName}" was not found.${availableComponentsMessage}`,
    )
  }

  if (matchingPcbComponents.length > 1) {
    throw new Error(
      `PCB component name "${componentName}" is ambiguous (${matchingPcbComponents.length} matches).`,
    )
  }

  const component = matchingPcbComponents[0]
  const rotationRadians = (Number(component.rotation) * Math.PI) / 180
  const rotatedWidth =
    Math.abs(component.width * Math.cos(rotationRadians)) +
    Math.abs(component.height * Math.sin(rotationRadians))
  const rotatedHeight =
    Math.abs(component.width * Math.sin(rotationRadians)) +
    Math.abs(component.height * Math.cos(rotationRadians))

  return {
    minX: component.center.x - rotatedWidth / 2 - padding,
    minY: component.center.y - rotatedHeight / 2 - padding,
    maxX: component.center.x + rotatedWidth / 2 + padding,
    maxY: component.center.y + rotatedHeight / 2 + padding,
  }
}
