import { execSync } from "node:child_process"
import kleur from "kleur"
import { loadProjectConfig } from "lib/project-config"
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
  previewGltf?: boolean
  useCdnJavascript?: boolean
  concurrency?: string
}

const runCommand = (command: string, cwd: string) => {
  console.log(kleur.cyan(`Running: ${command}`))
  execSync(command, { stdio: "inherit", cwd })
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
  if (!options?.ci) {
    return { resolvedOptions: options, handled: false }
  }

  const projectConfig = loadProjectConfig(projectDir)

  await installProjectDependencies({
    cwd: projectDir,
    skipTscircuitPackage: projectConfig?.alwaysUseLatestTscircuitOnCloud,
  })
  const prebuildCommand = projectConfig?.prebuildCommand?.trim()
  const buildCommand = projectConfig?.buildCommand?.trim()

  if (prebuildCommand) {
    runCommand(prebuildCommand, projectDir)
  }

  if (buildCommand) {
    runCommand(buildCommand, projectDir)
    return { resolvedOptions: options, handled: true }
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
    },
    handled: false,
  }
}
