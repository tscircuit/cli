import fs from "node:fs"
import type { PlatformConfig } from "@tscircuit/props"
import { runAllPinSpecificationChecks } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import path from "node:path"

type CircuitJsonIssue = {
  type?: string
  warning_type?: string
  error_type?: string
  message?: string
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

const isPrebuiltCircuitJsonFile = (filePath: string) => {
  const normalizedInputPath = filePath.toLowerCase().replaceAll("\\", "/")

  return (
    normalizedInputPath.endsWith(".circuit.json") ||
    normalizedInputPath.endsWith("/circuit.json")
  )
}

const getCircuitJsonForPinSpecificationCheck = async (filePath: string) => {
  if (isPrebuiltCircuitJsonFile(filePath)) {
    const parsedJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return Array.isArray(parsedJson) ? parsedJson : []
  }

  const completePlatformConfig = getCompletePlatformConfig({
    pcbDisabled: true,
    routingDisabled: true,
    placementDrcChecksDisabled: true,
  } satisfies PlatformConfig)

  const { circuitJson } = await generateCircuitJson({
    filePath,
    platformConfig: completePlatformConfig,
  })

  return circuitJson
}

export const checkPinSpecification = async (file?: string) => {
  const resolvedInputFilePath = await resolveInputFilePath(file)
  const typedCircuitJson = (await getCircuitJsonForPinSpecificationCheck(
    resolvedInputFilePath,
  )) as AnyCircuitElement[]
  const pinSpecificationIssues = (await runAllPinSpecificationChecks(
    typedCircuitJson,
  )) as CircuitJsonIssue[]

  const errors = pinSpecificationIssues.filter((issue) => "error_type" in issue)
  const warnings = pinSpecificationIssues.filter(
    (issue) => "warning_type" in issue || issue.type?.endsWith("_warning"),
  )

  const diagnosticsLines = [
    `Errors: ${errors.length}`,
    `Warnings: ${warnings.length}`,
  ]

  if (pinSpecificationIssues.length > 0) {
    diagnosticsLines.push(
      ...pinSpecificationIssues.map((issue) => {
        const issueType = issue.warning_type ?? issue.error_type ?? issue.type
        return `- ${issueType}: ${issue.message ?? ""}`
      }),
    )
  }

  return diagnosticsLines.join("\n")
}

export const registerCheckPinSpecification = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("pin_specification")
    .description("Partially build and validate pin specification checks")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const output = await checkPinSpecification(file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
