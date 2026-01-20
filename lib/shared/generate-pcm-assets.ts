import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import JSZip from "jszip"

export interface GeneratePcmAssetsOptions {
  /** Name of the package (e.g., "a555timer") */
  packageName: string
  /** Version of the package (e.g., "1.0.0") */
  version: string
  /** Author/owner of the package (e.g., "seveibar") */
  author: string
  /** Short description of the package */
  description?: string
  /** Full description of the package */
  descriptionFull?: string
  /** License (default: "MIT") */
  license?: string
  /** Path to the kicad-library output directory */
  kicadLibraryPath: string
  /** Output directory for PCM assets (e.g., "dist/pcm") */
  outputDir: string
  /** Base URL where PCM will be hosted (e.g., "https://author.tscircuit.app/package/dist/pcm") */
  baseUrl?: string
}

export interface GeneratePcmAssetsResult {
  outputDir: string
  repositoryJsonPath: string
  packagesJsonPath: string
  packageZipPath: string
  packageZipSha256: string
  packageZipSize: number
}

/**
 * Generates KiCad PCM (Plugin and Content Manager) assets from a kicad-library export.
 * Creates repository.json, packages.json, and the package ZIP file.
 */
export async function generatePcmAssets(
  options: GeneratePcmAssetsOptions,
): Promise<GeneratePcmAssetsResult> {
  const {
    packageName,
    version,
    author,
    description = `${packageName} - tscircuit component`,
    descriptionFull = `A tscircuit component exported for use in KiCad. Visit https://tscircuit.com/${author}/${packageName} for more information.`,
    license = "MIT",
    kicadLibraryPath,
    outputDir,
    baseUrl,
  } = options

  // Create PCM identifier (must be alphanumeric with dots/dashes, 2-50 chars)
  const identifier = `com.tscircuit.${author}.${packageName}`
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .slice(0, 50)

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Create metadata.json for inside the ZIP
  const metadata = {
    $schema: "https://go.kicad.org/pcm/schemas/v1",
    name: `tscircuit ${packageName}`,
    description: description.slice(0, 500),
    description_full: descriptionFull.slice(0, 5000),
    identifier,
    type: "library",
    author: {
      name: author,
      contact: {
        web: `https://tscircuit.com/${author}`,
      },
    },
    license,
    resources: {},
    versions: [
      {
        version,
        status: "stable",
        kicad_version: "7.0",
      },
    ],
  }

  // Create the ZIP file
  const zipFileName = `${identifier}-${version}.zip`
  const zipFilePath = path.join(outputDir, zipFileName)

  await createPcmZip({
    kicadLibraryPath,
    metadata,
    outputPath: zipFilePath,
  })

  // Calculate SHA256 and size of the ZIP
  const zipBuffer = fs.readFileSync(zipFilePath)
  const sha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex")
  const zipSize = zipBuffer.length

  // Determine download URL (baseUrl + /pcm/ path + filename)
  const downloadUrl = baseUrl
    ? `${baseUrl}/pcm/${zipFileName}`
    : `./${zipFileName}`

  // Create packages.json
  const packagesJson = {
    packages: [
      {
        identifier,
        name: `tscircuit ${packageName}`,
        description: description.slice(0, 500),
        description_full: descriptionFull.slice(0, 5000),
        type: "library",
        author: {
          name: author,
          contact: {
            web: `https://tscircuit.com/${author}`,
          },
        },
        license,
        resources: {},
        versions: [
          {
            version,
            status: "stable",
            kicad_version: "7.0",
            download_url: downloadUrl,
            download_sha256: sha256,
            download_size: zipSize,
            install_size: zipSize * 2, // Estimate
          },
        ],
      },
    ],
  }

  const packagesJsonPath = path.join(outputDir, "packages.json")
  fs.writeFileSync(packagesJsonPath, JSON.stringify(packagesJson, null, 2))

  // Calculate SHA256 of packages.json
  const packagesJsonBuffer = fs.readFileSync(packagesJsonPath)
  const packagesJsonSha256 = crypto
    .createHash("sha256")
    .update(packagesJsonBuffer)
    .digest("hex")

  // Create repository.json
  const packagesJsonUrl = baseUrl
    ? `${baseUrl}/pcm/packages.json`
    : "./packages.json"

  const repositoryJson = {
    $schema: "https://go.kicad.org/pcm/schemas/v1",
    name: `tscircuit ${author}/${packageName}`,
    maintainer: {
      name: author,
      contact: {
        web: `https://tscircuit.com/${author}`,
      },
    },
    packages: {
      url: packagesJsonUrl,
      sha256: packagesJsonSha256,
      update_timestamp: Math.floor(Date.now() / 1000),
    },
  }

  const repositoryJsonPath = path.join(outputDir, "repository.json")
  fs.writeFileSync(repositoryJsonPath, JSON.stringify(repositoryJson, null, 2))

  return {
    outputDir,
    repositoryJsonPath,
    packagesJsonPath,
    packageZipPath: zipFilePath,
    packageZipSha256: sha256,
    packageZipSize: zipSize,
  }
}

/**
 * Recursively adds all files from a directory to a JSZip instance.
 */
function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, entryZipPath)
    } else {
      const content = fs.readFileSync(fullPath)
      zip.file(entryZipPath, content)
    }
  }
}

/**
 * Creates a PCM-compatible ZIP file from a kicad-library directory.
 */
async function createPcmZip(options: {
  kicadLibraryPath: string
  metadata: Record<string, unknown>
  outputPath: string
}): Promise<void> {
  const { kicadLibraryPath, metadata, outputPath } = options

  const zip = new JSZip()

  // Add metadata.json
  zip.file("metadata.json", JSON.stringify(metadata, null, 2))

  // Add footprints directory if it exists
  const footprintsDir = path.join(kicadLibraryPath, "footprints")
  if (fs.existsSync(footprintsDir)) {
    addDirectoryToZip(zip, footprintsDir, "footprints")
  }

  // Add symbols directory if it exists
  const symbolsDir = path.join(kicadLibraryPath, "symbols")
  if (fs.existsSync(symbolsDir)) {
    addDirectoryToZip(zip, symbolsDir, "symbols")
  }

  // Add 3dmodels directory if it exists
  const modelsDir = path.join(kicadLibraryPath, "3dmodels")
  if (fs.existsSync(modelsDir)) {
    addDirectoryToZip(zip, modelsDir, "3dmodels")
  }

  // Generate ZIP and write to file
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  })

  fs.writeFileSync(outputPath, zipBuffer)
}
