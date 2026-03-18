import type { PlatformConfig } from "@tscircuit/props"
import { runAllPinSpecificationChecks } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

type CircuitJsonIssue = {
  type?: string
  warning_type?: string
  error_type?: string
  message?: string
}

export const checkPinSpecification = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const typedCircuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: true,
      routingDisabled: true,
      placementDrcChecksDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]
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
