import type { PartsEngine, PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"
import { compareSupplierFootprint } from "./compare-footprints"

type CircuitRecord = AnyCircuitElement & Record<string, unknown>

type SupplierPartCandidate = {
  supplierName: string
  supplierPartNumber: string
}

type SupplierFootprintCheck = {
  componentName: string
  supplierName: string
  supplierPartNumber: string
  status: "passed" | "failed"
  messages: string[]
}

export type CheckSupplierFootprintsResult = {
  output: string
  checks: SupplierFootprintCheck[]
  skippedComponentCount: number
  hasErrors: boolean
}

type FetchPartCircuitJson = NonNullable<PartsEngine["fetchPartCircuitJson"]>

const getSupplierPartCandidates = (
  supplierPartNumbers: unknown,
): SupplierPartCandidate[] => {
  if (typeof supplierPartNumbers !== "object" || supplierPartNumbers === null) {
    return []
  }

  const candidates: SupplierPartCandidate[] = []
  for (const [supplierName, partNumbers] of Object.entries(
    supplierPartNumbers,
  )) {
    if (!Array.isArray(partNumbers)) continue
    for (const partNumber of partNumbers) {
      if (typeof partNumber !== "string" || partNumber.length === 0) continue
      candidates.push({ supplierName, supplierPartNumber: partNumber })
    }
  }
  return candidates
}

const mapWithConcurrency = async <Input, Output>(
  inputs: Input[],
  concurrency: number,
  callback: (input: Input) => Promise<Output>,
) => {
  const outputs = new Array<Output>(inputs.length)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < inputs.length) {
      const index = nextIndex++
      outputs[index] = await callback(inputs[index]!)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, worker),
  )
  return outputs
}

export const checkSupplierFootprintsInCircuitJson = async ({
  circuitJson,
  fetchPartCircuitJson,
}: {
  circuitJson: AnyCircuitElement[]
  fetchPartCircuitJson: FetchPartCircuitJson
}): Promise<CheckSupplierFootprintsResult> => {
  const sourceComponents = circuitJson.filter(
    (element): element is CircuitRecord =>
      typeof element === "object" &&
      element !== null &&
      element.type === "source_component",
  )
  const workItems: Array<{
    componentName: string
    pcbComponentId: string
    candidate: SupplierPartCandidate
  }> = []
  let skippedComponentCount = 0

  for (const sourceComponent of sourceComponents) {
    const pcbComponent = circuitJson.find(
      (element) =>
        typeof element === "object" &&
        element !== null &&
        element.type === "pcb_component" &&
        "source_component_id" in element &&
        element.source_component_id === sourceComponent.source_component_id,
    ) as CircuitRecord | undefined

    if (
      !pcbComponent ||
      typeof pcbComponent.pcb_component_id !== "string" ||
      pcbComponent.do_not_place === true
    ) {
      continue
    }

    const candidates = getSupplierPartCandidates(
      sourceComponent.supplier_part_numbers,
    )
    if (candidates.length === 0) {
      skippedComponentCount++
      continue
    }

    for (const candidate of candidates) {
      workItems.push({
        componentName:
          typeof sourceComponent.name === "string"
            ? sourceComponent.name
            : String(sourceComponent.source_component_id),
        pcbComponentId: pcbComponent.pcb_component_id,
        candidate,
      })
    }
  }

  const supplierCircuitJsonCache = new Map<
    string,
    Promise<AnyCircuitElement[] | undefined>
  >()
  const checks = await mapWithConcurrency(workItems, 6, async (workItem) => {
    const { supplierName, supplierPartNumber } = workItem.candidate
    const cacheKey = `${supplierName}:${supplierPartNumber}`
    let supplierCircuitJsonPromise = supplierCircuitJsonCache.get(cacheKey)
    if (!supplierCircuitJsonPromise) {
      supplierCircuitJsonPromise = Promise.resolve(
        fetchPartCircuitJson({ supplierPartNumber }),
      )
      supplierCircuitJsonCache.set(cacheKey, supplierCircuitJsonPromise)
    }

    try {
      const supplierCircuitJson = await supplierCircuitJsonPromise
      if (!supplierCircuitJson || supplierCircuitJson.length === 0) {
        return {
          componentName: workItem.componentName,
          supplierName,
          supplierPartNumber,
          status: "failed" as const,
          messages: ["supplier returned no footprint circuit JSON"],
        }
      }

      const comparison = compareSupplierFootprint({
        localCircuitJson: circuitJson,
        localPcbComponentId: workItem.pcbComponentId,
        supplierCircuitJson,
      })
      return {
        componentName: workItem.componentName,
        supplierName,
        supplierPartNumber,
        status: comparison.matches ? ("passed" as const) : ("failed" as const),
        messages: comparison.mismatches.map((mismatch) => mismatch.message),
      }
    } catch (error) {
      return {
        componentName: workItem.componentName,
        supplierName,
        supplierPartNumber,
        status: "failed" as const,
        messages: [
          `failed to fetch supplier footprint: ${error instanceof Error ? error.message : String(error)}`,
        ],
      }
    }
  })

  const failedChecks = checks.filter((check) => check.status === "failed")
  const passedChecks = checks.length - failedChecks.length
  const lines = [
    "Supplier footprint check:",
    `Checked: ${checks.length}`,
    `Passed: ${passedChecks}`,
    `Errors: ${failedChecks.length}`,
    `Skipped without supplier part numbers: ${skippedComponentCount}`,
  ]

  if (failedChecks.length > 0) {
    lines.push(
      ...failedChecks.flatMap((check) => [
        `- ${check.componentName} (${check.supplierName}:${check.supplierPartNumber})`,
        ...check.messages.map((message) => `  - ${message}`),
      ]),
    )
  }

  return {
    output: lines.join("\n"),
    checks,
    skippedComponentCount,
    hasErrors: failedChecks.length > 0,
  }
}

export const getCheckSupplierFootprintsResult = async (
  file?: string,
  dependencies: { fetchPartCircuitJson?: FetchPartCircuitJson } = {},
) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const platformConfig = getPlatformConfigWithCliDefaults({
    pcbDisabled: false,
    routingDisabled: true,
    placementDrcChecksDisabled: true,
  } satisfies PlatformConfig)
  const fetchPartCircuitJson =
    dependencies.fetchPartCircuitJson ??
    platformConfig.partsEngine?.fetchPartCircuitJson

  if (!fetchPartCircuitJson) {
    throw new Error(
      "The configured parts engine does not support fetching supplier footprints",
    )
  }

  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig,
    allowPrebuiltCircuitJson: true,
  })

  return checkSupplierFootprintsInCircuitJson({
    circuitJson,
    fetchPartCircuitJson,
  })
}

export const registerCheckSupplierFootprints = (program: Command) => {
  program.commands
    .find((command) => command.name() === "check")!
    .command("supplier-footprints")
    .description(
      "Compare local pad numbers and fabrication geometry with supplier footprints",
    )
    .argument("[file]", "Path to the entry file or prebuilt circuit JSON")
    .action(async (file?: string) => {
      try {
        const result = await getCheckSupplierFootprintsResult(file)
        console.log(result.output)
        if (result.hasErrors) process.exitCode = 1
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
