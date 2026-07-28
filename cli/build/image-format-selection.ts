import type { BuildCommandOptions } from "./build-ci"

export type BuildImageFormatSelection = {
  threeDPngs: boolean
  pcbPngs: boolean
  schematicPngs: boolean
  pcbSvgs: boolean
  schematicSvgs: boolean
  simulationSvgs: boolean
  simulationSchematicSvgs: boolean
}

export const DEFAULT_IMAGE_FORMAT_SELECTION: BuildImageFormatSelection = {
  threeDPngs: true,
  pcbPngs: false,
  schematicPngs: false,
  pcbSvgs: true,
  schematicSvgs: true,
  simulationSvgs: false,
  simulationSchematicSvgs: false,
}

export const EMPTY_IMAGE_FORMAT_SELECTION: BuildImageFormatSelection = {
  threeDPngs: false,
  pcbPngs: false,
  schematicPngs: false,
  pcbSvgs: false,
  schematicSvgs: false,
  simulationSvgs: false,
  simulationSchematicSvgs: false,
}

export const hasAnyImageFormatSelected = (
  selection: BuildImageFormatSelection,
) =>
  selection.threeDPngs ||
  selection.pcbPngs ||
  selection.schematicPngs ||
  selection.pcbSvgs ||
  selection.schematicSvgs ||
  selection.simulationSvgs ||
  selection.simulationSchematicSvgs

const hasNewOutputFlags = (options?: BuildCommandOptions) =>
  Boolean(
    options?.pngs ||
      options?.pcbPng ||
      options?.schematicPng ||
      options?.svgs ||
      options?.pcbSvgs ||
      options?.simulationSvgs ||
      options?.simulationSchematicSvgs ||
      options?.schematicSvgs,
  )

const hasEstablishedOutputFlags = (options?: BuildCommandOptions) =>
  Boolean(
    options?.["3d"] ||
      options?.["3dPng"] ||
      options?.pcbOnly ||
      options?.schematicOnly,
  )

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
      threeDPngs: Boolean(options?.["3d"] || options?.["3dPng"]),
      pcbPngs: false,
      schematicPngs: false,
      pcbSvgs: true,
      schematicSvgs: true,
      simulationSvgs: false,
      simulationSchematicSvgs: false,
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
    selection.simulationSvgs = true
    selection.simulationSchematicSvgs = true
  }
  if (options?.pcbSvgs) {
    selection.pcbSvgs = true
  }
  if (options?.pcbPng) {
    selection.pcbPngs = true
  }
  if (options?.schematicPng) {
    selection.schematicPngs = true
  }
  if (options?.schematicSvgs) {
    selection.schematicSvgs = true
  }
  if (options?.simulationSvgs) {
    selection.simulationSvgs = true
  }
  if (options?.simulationSchematicSvgs) {
    selection.simulationSchematicSvgs = true
  }
  if (options?.pngs || options?.["3d"] || options?.["3dPng"]) {
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
