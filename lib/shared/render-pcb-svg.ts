import { convertCircuitJsonToPcbSvg as renderNormalSvg } from "circuit-to-svg"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import {
  convertCircuitJsonToPcbSvg as renderSvg,
  type PcbSvgOptions,
} from "circuit-to-svg-xray"
import type { PcbRenderSettings } from "lib/shared/pcb-x-ray-options"

const copperTypes = new Set([
  "pcb_trace",
  "pcb_smtpad",
  "pcb_via",
  "pcb_plated_hole",
  "pcb_copper_pour",
  "pcb_copper_text",
])

export function resolveXRayElementIds(
  elements: AnyCircuitElement[],
  selectors: readonly string[],
): string[] {
  const map = getFullConnectivityMapFromCircuitJson(elements)
  const netOf = (element: AnyCircuitElement): string | undefined => {
    const record = element as unknown as Record<string, unknown>
    for (const key of [
      `${element.type}_id`,
      "pcb_port_id",
      "pcb_trace_id",
      "source_trace_id",
      "source_net_id",
    ]) {
      const id = record[key]
      if (typeof id === "string") {
        const net = map.getNetConnectedToId(id)
        if (net) return net
      }
    }
  }
  const nets = new Set<string>()
  for (const selector of selectors) {
    const direct = map.getNetConnectedToId(selector)
    const matches = new Set<string>()
    if (direct) matches.add(direct)
    else {
      for (const element of elements) {
        if (element.type !== "source_net" && element.type !== "source_trace")
          continue
        if (
          element.name?.trim() === selector ||
          (element.type === "source_trace" &&
            element.display_name?.trim() === selector)
        ) {
          const net = netOf(element)
          if (net) matches.add(net)
        }
      }
    }
    if (!matches.size)
      throw new Error(
        `No connected PCB net matches "${selector}". Use an exact net name, trace display name, or element ID.`,
      )
    if (matches.size > 1)
      throw new Error(
        `Net name "${selector}" is ambiguous. Use a source_net_id, source_trace_id, or PCB element ID.`,
      )
    nets.add([...matches][0]!)
  }
  const ids = elements
    .filter(
      (element) => copperTypes.has(element.type) && nets.has(netOf(element)!),
    )
    .map(
      (element) =>
        (element as unknown as Record<string, string>)[`${element.type}_id`]!,
    )
  if (selectors.length && !ids.length)
    throw new Error("The selected nets have no PCB copper to render.")
  return ids
}

export function convertCircuitJsonToPcbSvg(
  elements: AnyCircuitElement[],
  options: PcbRenderSettings & PcbSvgOptions = {},
): string {
  const { xRayNets, ...renderOptions } = options
  if (!xRayNets?.length) return renderNormalSvg(elements, renderOptions)
  return renderSvg(elements, {
    ...renderOptions,
    ...(xRayNets?.length
      ? { xRayElementIds: resolveXRayElementIds(elements, xRayNets) }
      : {}),
  })
}
