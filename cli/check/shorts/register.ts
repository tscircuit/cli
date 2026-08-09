import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type {
  BitmapShort,
  FindBitmapShortsOptions,
} from "@tscircuit/check-shorts"
import type { PlatformConfig } from "@tscircuit/props"
import type { Command } from "commander"
import {
  getCircuitJsonForCheck,
  type GetCircuitJsonForCheckProgressEvent,
  resolveCheckInputFilePath,
} from "../shared"

export interface CheckShortsOptions {
  mode?: "pcb" | "gerber"
  layer?: "top" | "bottom" | "all"
  pixelsPerMm?: string
  onProgress?: (message: string) => void
}

type BitmapShortProgressEvent =
  | {
      phase: "preparing"
      mode: "pcb" | "gerber"
      layer: string
    }
  | {
      phase: "rasterizing"
      mode: "pcb" | "gerber"
      layer: string
      width: number
      height: number
      completedGroups: number
      totalGroups: number
      currentConnectivityKey?: string
    }
  | {
      phase: "detecting"
      mode: "pcb" | "gerber"
      layer: string
    }
  | {
      phase: "complete"
      mode: "pcb" | "gerber"
      layer: string
      shortsFound: number
    }

type ProgressCapableFindBitmapShortsOptions = FindBitmapShortsOptions & {
  onProgress?: (event: BitmapShortProgressEvent) => void
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

type CheckShortsModule = typeof import("@tscircuit/check-shorts")

export const CHECK_SHORTS_CDN_URL =
  "https://jscdn.tscircuit.com/@tscircuit/check-shorts/latest/+esm"

const importCheckShortsFromCdn = async (
  url: string,
): Promise<CheckShortsModule> => await import(url)

const importCheckShortsFromPackage = async (): Promise<CheckShortsModule> =>
  await import("@tscircuit/check-shorts")

export const loadCheckShorts = async (
  options: {
    importFromCdn?: (url: string) => Promise<CheckShortsModule>
    preferCdn?: boolean
  } = {},
): Promise<CheckShortsModule> => {
  const importFromCdn = options.importFromCdn ?? importCheckShortsFromCdn
  const preferCdn =
    options.preferCdn ??
    (process.env.NODE_ENV !== "test" && process.env.TSCI_TEST_MODE !== "true")

  if (!preferCdn) return importCheckShortsFromPackage()

  try {
    return await importFromCdn(CHECK_SHORTS_CDN_URL)
  } catch (cdnError) {
    try {
      return await importCheckShortsFromPackage()
    } catch (packageError) {
      throw new AggregateError(
        [cdnError, packageError],
        "Failed to load @tscircuit/check-shorts from jscdn or the installed CLI package",
      )
    }
  }
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

const formatCircuitJsonProgress = (
  event: GetCircuitJsonForCheckProgressEvent,
): string => {
  const filename = path.basename(event.filePath)

  switch (event.phase) {
    case "reading-prebuilt":
      return `Reading prebuilt circuit JSON from ${filename}...`
    case "preparing-source":
      return `Preparing circuit JSON for ${filename} (using the current build when available)...`
    case "waiting-on-async-effect":
      return `Rendering circuit: waiting on ${event.asyncEffectName}...`
    case "ready":
      if (event.source === "cache") {
        return `Circuit JSON ready from the current build.`
      }
      if (event.source === "prebuilt") {
        return `Prebuilt circuit JSON ready.`
      }
      return `Circuit JSON rendered from source.`
  }
}

const createBitmapProgressReporter = (
  onProgress?: (message: string) => void,
) => {
  const lastReportedPercent = new Map<string, number>()

  return (event: BitmapShortProgressEvent) => {
    if (!onProgress) return

    const checkName = `${event.layer}/${event.mode}`
    if (event.phase === "preparing") {
      onProgress(`Preparing ${checkName} short-check bitmap...`)
      return
    }
    if (event.phase === "detecting") {
      onProgress(`Finding connected short regions on ${checkName}...`)
      return
    }
    if (event.phase === "complete") {
      onProgress(
        `Finished ${checkName}: ${event.shortsFound} short${event.shortsFound === 1 ? "" : "s"} found.`,
      )
      return
    }

    const percent =
      event.totalGroups === 0
        ? 100
        : Math.floor((event.completedGroups / event.totalGroups) * 100)
    const previousPercent = lastReportedPercent.get(checkName)
    const shouldReport =
      previousPercent === undefined ||
      event.completedGroups === event.totalGroups ||
      percent >= previousPercent + 10

    if (!shouldReport) return
    lastReportedPercent.set(checkName, percent)
    onProgress(
      `Rasterizing ${checkName} copper groups: ${event.completedGroups}/${event.totalGroups} (${percent}%)...`,
    )
  }
}

export const checkShorts = async (
  file?: string,
  options: CheckShortsOptions = {},
): Promise<CheckShortsResult> => {
  options.onProgress?.("Resolving check input...")
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
      routingDisabled: false,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
    onProgress: (event) =>
      options.onProgress?.(formatCircuitJsonProgress(event)),
  })
  options.onProgress?.("Loading short-check engine...")
  const {
    appendBitmapLegend,
    createShortDebugSvg,
    encodeRgbaPng,
    renderBitmapShortDebug,
  } = await loadCheckShorts()

  options.onProgress?.(
    `Checking ${layers.length === 1 ? layers[0] : "top and bottom"} ${mode} copper for shorts...`,
  )
  const reportBitmapProgress = createBitmapProgressReporter(options.onProgress)

  const debugRenders = await Promise.all(
    layers.map((layer) => {
      const renderOptions: ProgressCapableFindBitmapShortsOptions = {
        mode,
        layer,
        pixelsPerMm,
        onProgress: reportBitmapProgress,
      }
      return renderBitmapShortDebug(circuitJson, renderOptions)
    }),
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
  options.onProgress?.("Creating short debug artifacts...")
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
        const result = await checkShorts(file, {
          ...options,
          onProgress: (message) => console.log(message),
        })
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
