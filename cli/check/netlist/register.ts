import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"
import path from "node:path"

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

export const checkNetlist = async (file?: string) => {
  const resolvedInputFilePath = await resolveInputFilePath(file)

  const completePlatformConfig = getCompletePlatformConfig({
    routingDrcChecksDisabled: true,
    placementDrcChecksDisabled: true,
  } satisfies PlatformConfig)

  const { circuitJson } = await generateCircuitJson({
    filePath: resolvedInputFilePath,
    platformConfig: completePlatformConfig,
  })

  const typedCircuitJson = circuitJson as AnyCircuitElement[]
  const diagnostics = analyzeCircuitJson(typedCircuitJson)
  const readableNetlist = convertCircuitJsonToReadableNetlist(typedCircuitJson)

  const diagnosticsLines = [
    `Errors: ${diagnostics.errors.length}`,
    `Warnings: ${diagnostics.warnings.length}`,
  ]

  if (diagnostics.errors.length > 0) {
    diagnosticsLines.push(
      ...diagnostics.errors.map((err) => `- ${err.type}: ${err.message ?? ""}`),
    )
  }

  return `${diagnosticsLines.join("\n")}\n\nReadable Netlist:\n${readableNetlist}`
}

export const registerCheckNetlist = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("netlist")
    .description("Partially build and validate the netlist")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const output = await checkNetlist(file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
