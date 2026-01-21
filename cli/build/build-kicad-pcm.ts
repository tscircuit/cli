import path from "node:path"
import fs from "node:fs"
import kleur from "kleur"
import { convertToKicadLibrary } from "lib/shared/convert-to-kicad-library"
import { generatePcmAssets } from "lib/shared/generate-pcm-assets"
import { getPackageAuthor } from "lib/utils/get-package-author"

export interface BuildKicadPcmOptions {
  entryFile: string
  projectDir: string
  distDir: string
}

export async function buildKicadPcm({
  entryFile,
  projectDir,
  distDir,
}: BuildKicadPcmOptions): Promise<void> {
  const packageJsonPath = path.join(projectDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("No package.json found for KiCad PCM generation")
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  const packageName =
    packageJson.name?.split("/").pop()?.split(".").pop() ||
    path.basename(projectDir)
  const version = packageJson.version || "1.0.0"
  const author = getPackageAuthor(packageJson.name || "") || "tscircuit"
  const description = packageJson.description || ""

  const libraryName = path.basename(projectDir)
  const kicadLibOutputDir = path.join(distDir, "kicad-library")

  // First generate kicad-library if not already done
  if (!fs.existsSync(kicadLibOutputDir)) {
    await convertToKicadLibrary({
      filePath: entryFile,
      libraryName,
      outputDir: kicadLibOutputDir,
    })
  }

  // Generate PCM assets
  const pcmOutputDir = path.join(distDir, "pcm")
  // Base URL format: https://{author}--{packageName}.tscircuit.app
  const envDeploymentUrl = process.env.TSCIRCUIT_DEPLOYMENT_URL?.replace(
    /\/+$/,
    "",
  )
  const baseUrl =
    envDeploymentUrl ?? `https://${author}--${packageName}.tscircuit.app`

  await generatePcmAssets({
    packageName,
    version,
    author,
    description,
    kicadLibraryPath: kicadLibOutputDir,
    outputDir: pcmOutputDir,
    baseUrl,
  })

  console.log(
    `  KiCad PCM assets generated at ${kleur.dim(path.relative(process.cwd(), pcmOutputDir))}`,
  )
  console.log(
    `  Repository URL: ${kleur.cyan(`${baseUrl}/pcm/repository.json`)}`,
  )
}
