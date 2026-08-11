import type { AnyCircuitElement, LayerRef } from "circuit-json"

export type CheckShortsLayerOption = "top" | "bottom" | "all"

const innerCopperLayers = [
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
] satisfies LayerRef[]

export const getCheckShortLayers = ({
  circuitJson,
  layerOption,
}: {
  circuitJson: AnyCircuitElement[]
  layerOption: CheckShortsLayerOption
}): LayerRef[] => {
  if (layerOption !== "all") return [layerOption]

  const pcbBoard = circuitJson.find((element) => element.type === "pcb_board")
  const boardLayerCount =
    pcbBoard?.type === "pcb_board" ? pcbBoard.num_layers : 2
  const innerLayerCount = Math.max(0, Math.floor(boardLayerCount) - 2)

  return ["top", ...innerCopperLayers.slice(0, innerLayerCount), "bottom"]
}
