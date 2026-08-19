import type { AnyCircuitElement, LayerRef } from "circuit-json"

export type CheckShortsLayerOption = LayerRef | "all"

type InnerLayerRef = Exclude<LayerRef, "top" | "bottom">

const innerCopperLayers = [
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
] satisfies InnerLayerRef[]

export const getCheckShortLayers = ({
  circuitJson,
  layerOption,
}: {
  circuitJson: AnyCircuitElement[]
  layerOption: CheckShortsLayerOption
}): LayerRef[] => {
  const pcbBoard = circuitJson.find((element) => element.type === "pcb_board")
  const boardLayerCount =
    pcbBoard?.type === "pcb_board" ? pcbBoard.num_layers : 2
  const innerLayerCount = Math.max(0, Math.floor(boardLayerCount) - 2)
  const availableLayers: LayerRef[] =
    boardLayerCount <= 1
      ? ["top"]
      : ["top", ...innerCopperLayers.slice(0, innerLayerCount), "bottom"]

  if (layerOption === "all") return availableLayers

  if (!availableLayers.includes(layerOption)) {
    throw new Error(
      `--layer ${layerOption} is not available on this ${boardLayerCount}-layer board; available layers: ${availableLayers.join(", ")}`,
    )
  }

  return [layerOption]
}
