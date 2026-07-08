import type { PlatformConfig } from "@tscircuit/props"
import {
  appendBitmapLegend,
  createShortDebugSvg,
  encodeRgbaPng,
  renderBitmapShortDebug,
  type BitmapShort,
  type FindBitmapShortsOptions,
} from "@tscircuit/check-shorts"
import type { Command } from "commander"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

interface CheckShortsOptions {
  mode?: "pcb" | "gerber"
  layer?: "top" | "bottom" | "all"
  pixelsPerMm?: string
}

export interface CheckShortsResult {
  output: string
  shorts: BitmapShort[]
  artifacts?: Array<{
    content: Uint8Array | string
    contentType: "image/png" | "image/svg+xml"
    defaultOutputPath: string
  }>
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

const parseLayer = (layer?: string): "top" | "bottom" | "all" => {
  if (!layer) return "all"
  if (layer === "top" || layer === "bottom" || layer === "all") return layer
  throw new Error("--layer must be top, bottom, or all")
}

const formatLabels = (labels: string[]) =>
  labels.length > 0 ? labels.join(", ") : "(unknown)"

const formatShort = (short: BitmapShort, index: number) => {
  const center = `x=${short.center.x.toFixed(3)}mm y=${short.center.y.toFixed(3)}mm`
  return [
    `${index + 1}. ${short.layer}/${short.mode} short at ${center}`,
    `   ${formatLabels(short.firstOwnerLabels)} <-> ${formatLabels(short.secondOwnerLabels)}`,
    `   pixels=${short.pixelCount}`,
  ].join("\n")
}

const getShortArtifactOutputPath = () =>
  path.resolve(process.cwd(), "checks", "check-shorts", "bitmap.png")

const getShortPcbSnapshotOutputPath = () =>
  path.resolve(process.cwd(), "checks", "check-shorts", "pcb.svg")

export const checkShorts = async (
  file?: string,
  options: CheckShortsOptions = {},
): Promise<CheckShortsResult> => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const mode = parseMode(options.mode)
  const layerOption = parseLayer(options.layer)
  const layers =
    layerOption === "all"
      ? (["top", "bottom"] as const)
      : ([layerOption] as const)
  const pixelsPerMm = parsePixelsPerMm(options.pixelsPerMm)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })

  const debugRenders = await Promise.all(
    layers.map((layer) =>
      renderBitmapShortDebug(circuitJson, {
        mode,
        layer,
        pixelsPerMm,
      } satisfies FindBitmapShortsOptions),
    ),
  )
  const shorts = debugRenders.flatMap((debugRender) => debugRender.shorts)
  const filename = path.basename(resolvedInputFilePath)

  if (shorts.length === 0) {
    return {
      output: `No shorts detected in ${filename}`,
      shorts,
    }
  }

  const debugRenderWithShorts =
    debugRenders.find((debugRender) => debugRender.shorts.length > 0) ??
    debugRenders[0]!
  const debugRenderWithLegend = appendBitmapLegend(debugRenderWithShorts)
  const artifacts = [
    {
      content: encodeRgbaPng(debugRenderWithLegend),
      contentType: "image/png" as const,
      defaultOutputPath: getShortArtifactOutputPath(),
    },
    {
      content: createShortDebugSvg(circuitJson, shorts),
      contentType: "image/svg+xml" as const,
      defaultOutputPath: getShortPcbSnapshotOutputPath(),
    },
  ]

  return {
    output: [
      `Detected ${shorts.length} short${shorts.length === 1 ? "" : "s"} in ${filename}`,
      ...shorts.map(formatShort),
    ].join("\n"),
    shorts,
    artifacts,
  }
}

export const registerCheckShorts = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("shorts")
    .description("Detect unintended shorts between separate PCB copper groups")
    .argument("[file]", "Path to the entry file or prebuilt circuit JSON")
    .option(
      "--mode <mode>",
      "Bitmap source to analyze: pcb or gerber",
      "gerber",
    )
    .option("--layer <layer>", "Layer to analyze: top, bottom, or all", "all")
    .option("--pixels-per-mm <number>", "Bitmap resolution for short detection")
    .action(async (file?: string, options?: CheckShortsOptions) => {
      try {
        const result = await checkShorts(file, options)
        console.log(result.output)
        if (result.artifacts) {
          for (const artifact of result.artifacts) {
            const outputPath = artifact.defaultOutputPath
            await mkdir(path.dirname(outputPath), { recursive: true })
            await writeFile(outputPath, artifact.content)
            console.log(`Short debug artifact written to ${outputPath}`)
          }
        }
        if (result.shorts.length > 0) {
          process.exit(1)
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
