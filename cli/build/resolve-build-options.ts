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
  const configBuild = projectConfig?.build

  const configAppliedOpts: string[] = []

  // Check if any build output option was explicitly passed via CLI
  // If so, we should NOT merge with config options - CLI takes full control
  const hasExplicitBuildOutputOption =
    cliOptions?.kicad ||
    cliOptions?.kicadLibrary ||
    cliOptions?.kicadPcm ||
    cliOptions?.previewImages ||
    cliOptions?.allImages ||
    cliOptions?.transpile ||
    cliOptions?.site ||
    cliOptions?.previewGltf

  // Only apply config options if no explicit CLI build output options were passed
  if (!hasExplicitBuildOutputOption) {
    if (configBuild?.kicadLibrary) {
      configAppliedOpts.push("kicad")
      configAppliedOpts.push("kicad-library")
    }
    if (configBuild?.kicadPcm) {
      configAppliedOpts.push("kicad-pcm")
    }
    if (configBuild?.previewImages) {
      configAppliedOpts.push("preview-images")
    }
    if (configBuild?.typescriptLibrary) {
      configAppliedOpts.push("transpile")
    }
  }

  const options: BuildCommandOptions = {
    ...cliOptions,
    // Only fall back to config if no explicit CLI build output options were passed
    kicad: hasExplicitBuildOutputOption
      ? cliOptions?.kicad
      : (cliOptions?.kicad ?? configBuild?.kicadLibrary),
    kicadLibrary: hasExplicitBuildOutputOption
      ? cliOptions?.kicadLibrary
      : (cliOptions?.kicadLibrary ?? configBuild?.kicadLibrary),
    kicadPcm: hasExplicitBuildOutputOption
      ? cliOptions?.kicadPcm
      : (cliOptions?.kicadPcm ?? configBuild?.kicadPcm),
    previewImages: hasExplicitBuildOutputOption
      ? cliOptions?.previewImages
      : (cliOptions?.previewImages ?? configBuild?.previewImages),
    transpile: hasExplicitBuildOutputOption
      ? cliOptions?.transpile
      : (cliOptions?.transpile ?? configBuild?.typescriptLibrary),
  }

  return { options, configAppliedOpts }
}
