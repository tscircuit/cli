import { execSync } from "node:child_process"
import kleur from "kleur"
import {
  loadProjectConfig,
  type TscircuitProjectConfig,
} from "lib/project-config"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"

export interface BuildCommandOptions {
  ignoreErrors?: boolean
  ignoreWarnings?: boolean
  disablePcb?: boolean
  disablePartsEngine?: boolean
  ci?: boolean
  site?: boolean
  transpile?: boolean
  previewImages?: boolean
  allImages?: boolean
  kicad?: boolean
  kicadFootprintLibrary?: boolean
  kicadPcm?: boolean
  previewGltf?: boolean
  useCdnJavascript?: boolean
  concurrency?: string
}

const runCommand = (command: string, cwd: string) => {
  console.log(kleur.cyan(`Running: ${command}`))
  execSync(command, {
    stdio: "inherit",
    cwd,
    env: { ...process.env, TSCIRCUIT_INSIDE_BUILD_COMMAND: "1" },
  })
}

export const resolveBuildOptions = ({
  options,
  projectConfig,
}: {
  options?: BuildCommandOptions
  projectConfig: TscircuitProjectConfig | null
}): BuildCommandOptions => {
  return {
    ...options,
    previewImages:
      options?.previewImages ?? projectConfig?.build?.previewImages,
    transpile:
      options?.transpile ?? projectConfig?.build?.typescriptLibrary ?? false,
    site: options?.site ?? false,
    useCdnJavascript: options?.useCdnJavascript ?? false,
    ignoreErrors: options?.ignoreErrors ?? false,
    kicadFootprintLibrary:
      options?.kicadFootprintLibrary ?? projectConfig?.build?.kicadLibrary,
    kicadPcm: options?.kicadPcm ?? projectConfig?.build?.kicadPcm,
  }
}

export const applyCiBuildOptions = async ({
  projectDir,
  options,
}: {
  projectDir: string
  options?: BuildCommandOptions
}): Promise<{
  resolvedOptions?: BuildCommandOptions
  handled: boolean
}> => {
  const projectConfig = loadProjectConfig(projectDir)

  if (!options?.ci) {
    return {
      resolvedOptions: resolveBuildOptions({ options, projectConfig }),
      handled: false,
    }
  }

  // Check if we're already inside a buildCommand execution to prevent infinite recursion
  const insideBuildCommand = process.env.TSCIRCUIT_INSIDE_BUILD_COMMAND === "1"

  await installProjectDependencies({
    cwd: projectDir,
    skipTscircuitPackage: projectConfig?.alwaysUseLatestTscircuitOnCloud,
  })
  const prebuildCommand = projectConfig?.prebuildCommand?.trim()
  const buildCommand = projectConfig?.buildCommand?.trim()

  // Only run prebuildCommand and buildCommand if we're not already inside a buildCommand
  if (!insideBuildCommand) {
    if (prebuildCommand) {
      runCommand(prebuildCommand, projectDir)
    }

    if (buildCommand) {
      runCommand(buildCommand, projectDir)
      return { resolvedOptions: options, handled: true }
    }
  }

  return {
    resolvedOptions: {
      ...options,
      previewImages: options?.previewImages ?? true,
      transpile: options?.transpile ?? true,
      site: options?.site ?? true,
      useCdnJavascript: options?.useCdnJavascript ?? true,
      ignoreErrors: options?.ignoreErrors ?? true,
      kicadFootprintLibrary:
        options?.kicadFootprintLibrary ??
        projectConfig?.build?.kicadLibrary ??
        false,
      kicadPcm: options?.kicadPcm ?? projectConfig?.build?.kicadPcm ?? false,
    },
    handled: false,
  }
}
