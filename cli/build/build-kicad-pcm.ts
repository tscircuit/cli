import path from "node:path"
import fs from "node:fs"
import kleur from "kleur"
import {
  convertToKicadLibrary,
  type CircuitJsonToKicadModule,
} from "lib/shared/convert-to-kicad-library"
import { generatePcmAssets } from "lib/shared/generate-pcm-assets"
import { getPackageAuthor } from "lib/utils/get-package-author"
import { loadProjectConfig } from "lib/project-config"
import { resolveKicadLibraryName } from "lib/utils/resolve-kicad-library-name"

export interface BuildKicadPcmOptions {
  entryFile: string
  projectDir: string
  distDir: string
  /** Base URL for PCM assets (defaults to env TSCIRCUIT_DEPLOYMENT_URL or remote URL) */
  baseUrl?: string
  /**
   * Optional custom circuit-json-to-kicad module to use instead of the default.
   * This is useful for testing upstream changes to the circuit-json-to-kicad package.
   */
  circuitJsonToKicadModule?: CircuitJsonToKicadModule
}

export async function buildKicadPcm({
  entryFile,
  projectDir,
  distDir,
  baseUrl: baseUrlOption,
  circuitJsonToKicadModule,
}: BuildKicadPcmOptions): Promise<void> {
  const packageJsonPath = path.join(projectDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("No package.json found for KiCad PCM generation")
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
  const projectConfig = loadProjectConfig(projectDir)

  const packageName =
    packageJson.name?.split("/").pop()?.split(".").pop() ||
    path.basename(projectDir)
  const version = packageJson.version || "1.0.0"
  const author = getPackageAuthor(packageJson.name || "") || "tscircuit"
  const description = packageJson.description || ""

  const libraryName = resolveKicadLibraryName({ projectDir })
  const kicadLibOutputDir = path.join(distDir, "kicad-library-pcm")

  // Generate PCM package identifier (e.g., "com_tscircuit_author_package-name")
  const kicadPcmPackageId = `com_tscircuit_${author}_${packageName}`.replace(
    /\./g,
    "_",
  )

  // Generate kicad-library-pcm with PCM-specific paths
  // (PCM requires PCM_ prefixes and ${KICAD_3RD_PARTY} 3D model paths)
  // This is separate from dist/kicad-library which has non-PCM paths
  console.log("Converting to KiCad library for PCM...")
  await convertToKicadLibrary({
    filePath: entryFile,
    libraryName,
    outputDir: kicadLibOutputDir,
    isPcm: true,
    kicadPcmPackageId,
    circuitJsonToKicadModule,
  })

  // Generate PCM assets
  const pcmOutputDir = path.join(distDir, "pcm")
  // Base URL format: https://{author}--{packageName}.tscircuit.app
  const envDeploymentUrl = process.env.TSCIRCUIT_DEPLOYMENT_URL?.replace(
    /\/+$/,
    "",
  )
  const baseUrl =
    baseUrlOption ??
    envDeploymentUrl ??
    `https://${author}--${packageName}.tscircuit.app`

  console.log("Generating PCM assets...")
  await generatePcmAssets({
    packageName,
    version,
    author,
    description,
    kicadLibraryPath: kicadLibOutputDir,
    outputDir: pcmOutputDir,
    baseUrl,
    // Use custom display name if kicadLibraryName is configured
    displayName: projectConfig?.kicadLibraryName || undefined,
  })

  console.log(
    `  KiCad PCM assets generated at ${kleur.dim(path.relative(process.cwd(), pcmOutputDir))}`,
  )
  console.log(
    `  Repository URL: ${kleur.cyan(`${baseUrl}/pcm/repository.json`)}`,
  )
}
