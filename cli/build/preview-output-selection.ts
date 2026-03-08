import type { BuildCommandOptions } from "./build-ci"

export type BuildPreviewOutputSelection = {
  threeDPngs: boolean
  pcbSvgs: boolean
  schematicSvgs: boolean
}

export const DEFAULT_PREVIEW_OUTPUT_SELECTION: BuildPreviewOutputSelection = {
  threeDPngs: true,
  pcbSvgs: true,
  schematicSvgs: true,
}

export const EMPTY_PREVIEW_OUTPUT_SELECTION: BuildPreviewOutputSelection = {
  threeDPngs: false,
  pcbSvgs: false,
  schematicSvgs: false,
}

export const hasAnyPreviewOutput = (selection: BuildPreviewOutputSelection) =>
  selection.threeDPngs || selection.pcbSvgs || selection.schematicSvgs

const hasNewOutputFlags = (options?: BuildCommandOptions) =>
  Boolean(
    options?.pngs ||
      options?.svgs ||
      options?.pcbSvgs ||
      options?.schematicSvgs,
  )

const hasLegacyOutputFlags = (options?: BuildCommandOptions) =>
  Boolean(options?.["3d"] || options?.pcbOnly || options?.schematicOnly)

export const resolvePreviewOutputSelection = (
  options?: BuildCommandOptions,
): {
  selection: BuildPreviewOutputSelection
  hasExplicitSelection: boolean
} => {
  const hasNewFlags = hasNewOutputFlags(options)
  const hasLegacyFlags = hasLegacyOutputFlags(options)
  const hasExplicitSelection = hasNewFlags || hasLegacyFlags

  if (!hasExplicitSelection) {
    return {
      selection: { ...DEFAULT_PREVIEW_OUTPUT_SELECTION },
      hasExplicitSelection: false,
    }
  }

  if (!hasNewFlags && hasLegacyFlags) {
    const selection: BuildPreviewOutputSelection = {
      threeDPngs: Boolean(options?.["3d"]),
      pcbSvgs: true,
      schematicSvgs: true,
    }

    if (options?.pcbOnly && !options?.schematicOnly) {
      selection.schematicSvgs = false
    }

    if (options?.schematicOnly && !options?.pcbOnly) {
      selection.pcbSvgs = false
    }

    return { selection, hasExplicitSelection: true }
  }

  const selection: BuildPreviewOutputSelection = {
    ...EMPTY_PREVIEW_OUTPUT_SELECTION,
  }

  if (options?.svgs) {
    selection.pcbSvgs = true
    selection.schematicSvgs = true
  }
  if (options?.pcbSvgs) {
    selection.pcbSvgs = true
  }
  if (options?.schematicSvgs) {
    selection.schematicSvgs = true
  }
  if (options?.pngs || options?.["3d"]) {
    selection.threeDPngs = true
  }

  // Preserve compatibility with legacy filtering flags when used together.
  if (options?.pcbOnly && !options?.schematicOnly) {
    selection.schematicSvgs = false
  }
  if (options?.schematicOnly && !options?.pcbOnly) {
    selection.pcbSvgs = false
  }

  return { selection, hasExplicitSelection: true }
}
