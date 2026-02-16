import type { TscircuitProjectConfig } from "lib/project-config"
import type { BuildCommandOptions } from "./build-ci"

export interface ResolvedBuildOptions {
  options: BuildCommandOptions
  configAppliedOpts: string[]
}

export const resolveBuildOptions = ({
  cliOptions,
  projectConfig,
}: {
  cliOptions?: BuildCommandOptions
  projectConfig?: TscircuitProjectConfig | null
}): ResolvedBuildOptions => {
  if (cliOptions?.ignoreConfig) {
    return { options: cliOptions, configAppliedOpts: [] }
  }

  const configBuild = projectConfig?.build

  const configAppliedOpts: string[] = []

  if (
    !cliOptions?.kicad &&
    (configBuild?.kicadProject || configBuild?.kicadLibrary)
  ) {
    configAppliedOpts.push("kicad")
  }
  if (!cliOptions?.kicadLibrary && configBuild?.kicadLibrary) {
    configAppliedOpts.push("kicad-library")
  }
  if (!cliOptions?.kicadPcm && configBuild?.kicadPcm) {
    configAppliedOpts.push("kicad-pcm")
  }
  if (!cliOptions?.previewImages && configBuild?.previewImages) {
    configAppliedOpts.push("preview-images")
  }
  if (!cliOptions?.glbs && configBuild?.glbs) {
    configAppliedOpts.push("glbs")
  }
  if (!cliOptions?.transpile && configBuild?.typescriptLibrary) {
    configAppliedOpts.push("transpile")
  }

  const options: BuildCommandOptions = {
    ...cliOptions,
    kicad:
      cliOptions?.kicad ??
      configBuild?.kicadProject ??
      configBuild?.kicadLibrary,
    kicadLibrary: cliOptions?.kicadLibrary ?? configBuild?.kicadLibrary,
    kicadPcm: cliOptions?.kicadPcm ?? configBuild?.kicadPcm,
    previewImages: cliOptions?.previewImages ?? configBuild?.previewImages,
    glbs: cliOptions?.glbs ?? configBuild?.glbs,
    transpile: cliOptions?.transpile ?? configBuild?.typescriptLibrary,
  }

  return { options, configAppliedOpts }
}
