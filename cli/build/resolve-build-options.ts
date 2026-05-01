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

  if (!cliOptions?.kicadProject && configBuild?.kicadProject) {
    configAppliedOpts.push("kicad-project")
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
  if (!cliOptions?.steps && configBuild?.steps) {
    configAppliedOpts.push("steps")
  }
  if (
    cliOptions?.routingDisabled === undefined &&
    configBuild?.routingDisabled
  ) {
    configAppliedOpts.push("routing-disabled")
  }
  if (!cliOptions?.transpile && configBuild?.typescriptLibrary) {
    configAppliedOpts.push("transpile")
  }

  const options: BuildCommandOptions = {
    ...cliOptions,
    kicadProject: cliOptions?.kicadProject ?? configBuild?.kicadProject,
    kicadLibrary: cliOptions?.kicadLibrary ?? configBuild?.kicadLibrary,
    kicadLibraryName:
      cliOptions?.kicadLibraryName ?? projectConfig?.kicadLibraryName,
    kicadPcm: cliOptions?.kicadPcm ?? configBuild?.kicadPcm,
    previewImages: cliOptions?.previewImages ?? configBuild?.previewImages,
    glbs: cliOptions?.glbs ?? configBuild?.glbs,
    steps: cliOptions?.steps ?? configBuild?.steps,
    routingDisabled:
      cliOptions?.routingDisabled ?? configBuild?.routingDisabled,
    transpile: cliOptions?.transpile ?? configBuild?.typescriptLibrary,
  }

  return { options, configAppliedOpts }
}
