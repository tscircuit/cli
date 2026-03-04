import fs from "node:fs"
import path from "node:path"
import {
  analyzeAllPlacements,
  analyzeComponentPlacement,
} from "@tscircuit/circuit-json-placement-analysis"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { getEntrypoint } from "lib/shared/get-entrypoint"

const isPrebuiltCircuitJsonFile = (filePath: string) => {
  const normalizedInputPath = filePath.toLowerCase().replaceAll("\\", "/")

  return (
    normalizedInputPath.endsWith(".circuit.json") ||
    normalizedInputPath.endsWith("/circuit.json")
  )
}

const resolveInputFilePath = async (file?: string) => {
  if (file) {
    return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
  }

  const entrypoint = await getEntrypoint({
    projectDir: process.cwd(),
  })

  if (!entrypoint) {
    throw new Error("No input file provided and no entrypoint found")
  }

  return entrypoint
}

const getCircuitJsonForPlacementCheck = async (filePath: string) => {
  if (isPrebuiltCircuitJsonFile(filePath)) {
    const parsedJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))

    return Array.isArray(parsedJson) ? parsedJson : []
  }

  const completePlatformConfig = getCompletePlatformConfig({
    pcbDisabled: false,
    routingDisabled: true,
  } satisfies PlatformConfig)

  const { circuitJson } = await generateCircuitJson({
    filePath,
    platformConfig: completePlatformConfig,
  })

  return circuitJson
}

export const checkPlacement = async (file?: string, refdes?: string) => {
  const resolvedInputFilePath = await resolveInputFilePath(file)
  const circuitJson = (await getCircuitJsonForPlacementCheck(
    resolvedInputFilePath,
  )) as AnyCircuitElement[]

  const analysis = refdes
    ? analyzeComponentPlacement(circuitJson, refdes)
    : analyzeAllPlacements(circuitJson)

  return analysis.getString()
}

export const registerCheckPlacement = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("placement")
    .description("Partially build and validate the placement")
    .argument("[file]", "Path to the entry file")
    .argument("[refdes]", "Optional refdes to scope the check")
    .action(async (file?: string, refdes?: string) => {
      try {
        const output = await checkPlacement(file, refdes)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
