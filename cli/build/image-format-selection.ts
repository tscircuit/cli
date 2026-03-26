import type { BuildCommandOptions } from "./build-ci"

export type BuildImageFormatSelection = {
  threeDPngs: boolean
  pcbPngs: boolean
  pcbSvgs: boolean
  schematicSvgs: boolean
}

export const DEFAULT_IMAGE_FORMAT_SELECTION: BuildImageFormatSelection = {
  threeDPngs: true,
  pcbPngs: false,
  pcbSvgs: true,
  schematicSvgs: true,
}

export const EMPTY_IMAGE_FORMAT_SELECTION: BuildImageFormatSelection = {
  threeDPngs: false,
  pcbPngs: false,
  pcbSvgs: false,
  schematicSvgs: false,
}

export const hasAnyImageFormatSelected = (
  selection: BuildImageFormatSelection,
) =>
  selection.threeDPngs ||
  selection.pcbPngs ||
  selection.pcbSvgs ||
  selection.schematicSvgs

const hasNewOutputFlags = (options?: BuildCommandOptions) =>
  Boolean(
    options?.pngs ||
      options?.pcbPng ||
      options?.svgs ||
      options?.pcbSvgs ||
      options?.schematicSvgs,
  )

const hasEstablishedOutputFlags = (options?: BuildCommandOptions) =>
  Boolean(options?.["3d"] || options?.pcbOnly || options?.schematicOnly)

export const resolveImageFormatSelection = (
  options?: BuildCommandOptions,
): {
  selection: BuildImageFormatSelection
  hasExplicitSelection: boolean
} => {
  const hasNewFlags = hasNewOutputFlags(options)
  const hasEstablishedFlags = hasEstablishedOutputFlags(options)
  const hasExplicitSelection = hasNewFlags || hasEstablishedFlags

  if (!hasExplicitSelection) {
    return {
      selection: { ...DEFAULT_IMAGE_FORMAT_SELECTION },
      hasExplicitSelection: false,
    }
  }

  if (!hasNewFlags && hasEstablishedFlags) {
    const selection: BuildImageFormatSelection = {
      threeDPngs: Boolean(options?.["3d"]),
      pcbPngs: false,
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

  const selection: BuildImageFormatSelection = {
    ...EMPTY_IMAGE_FORMAT_SELECTION,
  }

  if (options?.svgs) {
    selection.pcbSvgs = true
    selection.schematicSvgs = true
  }
  if (options?.pcbSvgs) {
    selection.pcbSvgs = true
  }
  if (options?.pcbPng) {
    selection.pcbPngs = true
  }
  if (options?.schematicSvgs) {
    selection.schematicSvgs = true
  }
  if (options?.pngs || options?.["3d"]) {
    selection.threeDPngs = true
  }

  // Preserve compatibility with filtering flags when used together.
  if (options?.pcbOnly && !options?.schematicOnly) {
    selection.schematicSvgs = false
  }
  if (options?.schematicOnly && !options?.pcbOnly) {
    selection.pcbSvgs = false
  }

  return { selection, hasExplicitSelection: true }
}
