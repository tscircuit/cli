import { InvalidArgumentError, type Command } from "commander"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"

export type PcbXRayCliOptions = {
  xRayNet?: string[]
  hiddenLayerOpacity?: number
}

export function addPcbXRayOptions(command: Command): Command {
  return command
    .option(
      "--x-ray-net <name-or-id>",
      "Inspect a PCB net by exact name, display name, or connected element ID (repeatable)",
      (value: string, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      "--hidden-layer-opacity <opacity>",
      "Other copper opacity during X-Ray, from 0 to 1 (default: 0.2)",
      (value: string) => {
        const opacity = Number(value)
        if (
          !value.trim() ||
          !Number.isFinite(opacity) ||
          opacity < 0 ||
          opacity > 1
        )
          throw new InvalidArgumentError(
            "Opacity must be a number between 0 and 1.",
          )
        return opacity
      },
    )
}

export function getPcbXRaySettings(
  options: PcbXRayCliOptions,
): PcbSnapshotSettings {
  return {
    ...(options.xRayNet?.length ? { xRayNets: options.xRayNet } : {}),
    ...(options.hiddenLayerOpacity !== undefined
      ? { hiddenLayerOpacity: options.hiddenLayerOpacity }
      : {}),
  }
}
