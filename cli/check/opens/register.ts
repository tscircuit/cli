import type {
  BitmapOpen,
  FindBitmapOpensOptions,
} from "@tscircuit/check-shorts"
import type { PlatformConfig } from "@tscircuit/props"
import type { Command } from "commander"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"
import {
  type CheckShortsLayerOption,
  getCheckShortLayers,
} from "../shorts/get-check-short-layers"
import { loadCheckShorts } from "../shorts/register"

interface CheckOpensOptions {
  mode?: "pcb" | "gerber"
  layer?: CheckShortsLayerOption
  pixelsPerMm?: string
  ignoreNet?: string[]
}

export interface CheckOpensResult {
  output: string
  opens: BitmapOpen[]
}

const parsePixelsPerMm = (value?: string): number | undefined => {
  if (!value) return undefined
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error("--pixels-per-mm must be a positive number")
  }
  return parsedValue
}

const parseMode = (mode?: string): "pcb" | "gerber" => {
  if (!mode) return "gerber"
  if (mode === "pcb" || mode === "gerber") return mode
  throw new Error("--mode must be either pcb or gerber")
}

const parseLayer = (layer?: string): CheckShortsLayerOption => {
  if (!layer) return "all"
  if (layer === "top" || layer === "bottom" || layer === "all") return layer
  throw new Error("--layer must be top, bottom, or all")
}

const formatLabels = (labels: string[]) =>
  labels.length > 0 ? labels.join(", ") : "(unknown)"

const formatOpen = (open: BitmapOpen, index: number) => {
  const lines = [
    `${index + 1}. ${open.layer}/${open.mode} net split across ${open.islands.length} copper islands`,
    `   ${formatLabels(open.ownerLabels)}`,
  ]

  for (const island of open.islands) {
    const center = `x=${island.center.x.toFixed(3)}mm y=${island.center.y.toFixed(3)}mm`
    lines.push(`   island at ${center} pixels=${island.pixelCount}`)
  }

  return lines.join("\n")
}

export const checkOpens = async (
  file?: string,
  options: CheckOpensOptions = {},
): Promise<CheckOpensResult> => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const mode = parseMode(options.mode)
  const layerOption = parseLayer(options.layer)
  const pixelsPerMm = parsePixelsPerMm(options.pixelsPerMm)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: false,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })
  const { findBitmapOpens } = await loadCheckShorts()

  // Unlike shorts, opens are a whole-board question: a net routed top -> via ->
  // bottom is fully connected, but looked at one layer at a time it appears
  // split. So "all" means one analysis spanning every copper layer (the
  // detector's default), not one analysis per layer.
  const layers =
    layerOption === "all"
      ? undefined
      : getCheckShortLayers({ circuitJson, layerOption })

  const ignoreNets = options.ignoreNet?.length ? options.ignoreNet : undefined

  const opens = await findBitmapOpens(circuitJson, {
    mode,
    ...(layers?.[0] ? { layer: layers[0] } : {}),
    pixelsPerMm,
    ignoreNets,
    // ignoreNets ships in @tscircuit/check-shorts after 0.0.19; widen the
    // pinned type until the dependency is bumped.
  } satisfies FindBitmapOpensOptions & { ignoreNets?: string[] })
  const filename =
    resolvedInputFilePath.split("/").pop() ?? resolvedInputFilePath

  if (opens.length === 0) {
    return { output: `No opens detected in ${filename}`, opens }
  }

  return {
    output: [
      `Detected ${opens.length} open${opens.length === 1 ? "" : "s"} in ${filename}`,
      ...opens.map(formatOpen),
    ].join("\n"),
    opens,
  }
}

export const registerCheckOpens = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("opens")
    .description(
      "Detect nets whose copper is not fully joined (unrouted connections)",
    )
    .argument("[file]", "Path to the entry file or prebuilt circuit JSON")
    .option(
      "--mode <mode>",
      "Bitmap source to analyze: pcb or gerber",
      "gerber",
    )
    .option("--layer <layer>", "Layer to analyze: top, bottom, or all", "all")
    .option("--pixels-per-mm <number>", "Bitmap resolution for open detection")
    .option(
      "--ignore-net <name>",
      "Net to exclude from open detection, for nets joined off the board by design (mounting holes bonded through a metal enclosure, signals joined by a cable or mating connector). Repeatable.",
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .action(async (file?: string, options?: CheckOpensOptions) => {
      try {
        const result = await checkOpens(file, options)
        console.log(result.output)
        if (result.opens.length > 0) {
          process.exit(1)
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
