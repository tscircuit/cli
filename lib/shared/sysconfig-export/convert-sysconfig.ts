import { any_circuit_element } from "circuit-json"
import { convertCircuitJsonToSysConfig } from "circuit-json-to-sysconfig"
import { z } from "zod"
import type { SysconfigExportOptions } from "./read-options"
import { resolveSysconfigOptions } from "./resolve-options"

export function convertToSysconfig(
  circuitJson: unknown,
  options: SysconfigExportOptions,
): string {
  const records = z
    .array(z.object({ type: z.string() }).passthrough())
    .parse(circuitJson)
  const sourceRecords = records.filter((record) =>
    record.type.startsWith("source_"),
  )
  const sourceError = sourceRecords.find((record) =>
    record.type.endsWith("_error"),
  )
  if (sourceError)
    throw new Error(`Cannot export SysConfig with a ${sourceError.type} record`)
  // Source identities are all the converter needs. Do not require PCB routing or
  // reject a source export because a newer geometry record has an unrelated schema.
  const sourceCircuit = any_circuit_element.array().parse(sourceRecords)
  const resolvedOptions = resolveSysconfigOptions(options, sourceCircuit)
  return convertCircuitJsonToSysConfig(
    sourceCircuit,
    resolvedOptions,
  ).getString()
}
