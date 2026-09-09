import type { PartsEngine, PlatformConfig } from "@tscircuit/props"
import type {
  AnyCircuitElement,
  PcbComponent,
  SupplierName,
} from "circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"
import { compareSupplierFootprint } from "./compare-footprints"

type SupplierPartCandidate = {
  supplierName: SupplierName
  supplierPartNumber: string
}

type SupplierFootprintCheck = {
  componentName: string
  supplierName: SupplierName
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
type SupplierPartCacheKey = `${SupplierName}:${string}`

const getSupplierPartCandidates = (
  supplierPartNumbers: Partial<Record<SupplierName, string[]>> | undefined,
) => {
  if (!supplierPartNumbers) return []

  return Object.entries(supplierPartNumbers).flatMap(
    ([supplierName, partNumbers]) =>
      (partNumbers ?? []).map((supplierPartNumber) => ({
        supplierName: supplierName as SupplierName,
        supplierPartNumber,
      })),
  )
}

const mapWithConcurrency = async <Input, Output>({
  items,
  concurrency,
  run,
}: {
  items: Input[]
  concurrency: number
  run: (item: Input) => Promise<Output>
}) => {
  const outputs = new Array<Output>(items.length)
  let nextIndex = 0

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++
        outputs[index] = await run(items[index]!)
      }
    }),
  )
  return outputs
}

const getSupplierPartCacheKey = ({
  supplierName,
  supplierPartNumber,
}: SupplierPartCandidate): SupplierPartCacheKey =>
  `${supplierName}:${supplierPartNumber}`

export const checkSupplierFootprintsInCircuitJson = async ({
  circuitJson,
  fetchPartCircuitJson,
}: {
  circuitJson: AnyCircuitElement[]
  fetchPartCircuitJson: FetchPartCircuitJson
}): Promise<CheckSupplierFootprintsResult> => {
  const workItems: Array<{
    componentName: string
    pcbComponentId: string
    candidate: SupplierPartCandidate
  }> = []
  let skippedComponentCount = 0

  for (const sourceComponent of circuitJson) {
    if (sourceComponent.type !== "source_component") continue

    const pcbComponent = circuitJson.find(
      (element): element is PcbComponent =>
        element.type === "pcb_component" &&
        element.source_component_id === sourceComponent.source_component_id,
    )
    if (!pcbComponent || pcbComponent.do_not_place) continue

    const candidates = getSupplierPartCandidates(
      sourceComponent.supplier_part_numbers,
    )
    if (candidates.length === 0) {
      skippedComponentCount++
      continue
    }

    for (const candidate of candidates) {
      workItems.push({
        componentName: sourceComponent.name,
        pcbComponentId: pcbComponent.pcb_component_id,
        candidate,
      })
    }
  }

  const supplierCircuitJsonCache = new Map<
    SupplierPartCacheKey,
    Promise<AnyCircuitElement[] | undefined>
  >()
  const checks = await mapWithConcurrency({
    items: workItems,
    concurrency: 6,
    run: async (workItem): Promise<SupplierFootprintCheck> => {
      const { supplierName, supplierPartNumber } = workItem.candidate
      const cacheKey = getSupplierPartCacheKey(workItem.candidate)
      let supplierCircuitJsonPromise = supplierCircuitJsonCache.get(cacheKey)
      if (!supplierCircuitJsonPromise) {
        supplierCircuitJsonPromise = Promise.resolve(
          fetchPartCircuitJson({ supplierPartNumber }),
        )
        supplierCircuitJsonCache.set(cacheKey, supplierCircuitJsonPromise)
      }

      let supplierCircuitJson: AnyCircuitElement[] | undefined
      try {
        supplierCircuitJson = await supplierCircuitJsonPromise
      } catch (error) {
        return {
          componentName: workItem.componentName,
          supplierName,
          supplierPartNumber,
          status: "failed",
          messages: [
            `failed to fetch supplier footprint: ${error instanceof Error ? error.message : String(error)}`,
          ],
        }
      }

      if (!supplierCircuitJson?.length) {
        return {
          componentName: workItem.componentName,
          supplierName,
          supplierPartNumber,
          status: "failed",
          messages: ["supplier returned no footprint circuit JSON"],
        }
      }

      try {
        const comparison = compareSupplierFootprint({
          localCircuitJson: circuitJson,
          localPcbComponentId: workItem.pcbComponentId,
          supplierCircuitJson,
        })
        return {
          componentName: workItem.componentName,
          supplierName,
          supplierPartNumber,
          status: comparison.matches ? "passed" : "failed",
          messages: comparison.mismatches.map((mismatch) => mismatch.message),
        }
      } catch (error) {
        return {
          componentName: workItem.componentName,
          supplierName,
          supplierPartNumber,
          status: "failed",
          messages: [
            `failed to compare supplier footprint: ${error instanceof Error ? error.message : String(error)}`,
          ],
        }
      }
    },
  })

  const failedChecks = checks.filter((check) => check.status === "failed")
  const lines = [
    "Supplier footprint check:",
    `Checked: ${checks.length}`,
    `Passed: ${checks.length - failedChecks.length}`,
    `Errors: ${failedChecks.length}`,
    `Skipped without supplier part numbers: ${skippedComponentCount}`,
  ]

  lines.push(
    ...failedChecks.flatMap((check) => [
      `- ${check.componentName} (${check.supplierName}:${check.supplierPartNumber})`,
      ...check.messages.map((message) => `  - ${message}`),
    ]),
  )

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
