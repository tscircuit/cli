import fs from "node:fs/promises"
import path from "node:path"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { getPartsEngineBaseUrl } from "lib/shared/parts-engine-base-urls"
import {
  BakedAssetNotFoundError,
  getPlatformFetch,
} from "lib/shared/get-platform-fetch"
import {
  REFERENCE_DESIGNS_DIRECTORY,
  REFERENCE_DESIGN_METADATA_FILENAME,
} from "lib/shared/reference-design-paths"
import { z } from "zod"

const catalogSchema = z.object({
  packages: z.array(z.string().regex(/^[\w-]+\/[\w-]+$/)),
})
const manifestSchema = z.object({
  version: z.literal(2),
  componentPartNumbers: z.array(z.string()),
})
const normalizePartNumber = (partNumber: string) =>
  partNumber.trim().toUpperCase()

type RegistryApi = ReturnType<typeof getRegistryApiKy>

async function ensureDirectory(directory: string) {
  await fs.mkdir(directory).catch((error) => {
    if (error.code !== "EEXIST") throw error
  })
  if (!(await fs.lstat(directory)).isDirectory()) {
    throw new Error(`${directory} is not a directory`)
  }
}

async function pathExists(filePath: string) {
  try {
    await fs.lstat(filePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    return false
  }
}

async function downloadReferenceDesign({
  ky,
  name,
  releaseId,
  projectDir,
}: {
  ky: RegistryApi
  name: string
  releaseId: string
  projectDir: string
}) {
  const [author, packageName] = name.split("/")
  const root = path.join(projectDir, REFERENCE_DESIGNS_DIRECTORY)
  const authorDir = path.join(root, author)
  const destination = path.join(authorDir, packageName)
  await ensureDirectory(root)
  await ensureDirectory(authorDir)
  if (await pathExists(destination)) return

  const { package_files: files } = await ky
    .get("package_files/list", {
      searchParams: { package_release_id: releaseId },
    })
    .json<{ package_files: { file_path: string; package_file_id: string }[] }>()
  const staged = await fs.mkdtemp(path.join(authorDir, ".import-"))
  try {
    for (const { file_path: filePath, package_file_id: fileId } of files) {
      const segments = filePath.split("/")
      if (
        segments.some(
          (segment) =>
            !segment ||
            segment === "." ||
            segment === ".." ||
            /[\\:\x00-\x1f]|[. ]$/.test(segment),
        )
      ) {
        throw new Error(`Invalid package file path: ${filePath}`)
      }
      if (
        segments[0] === "dist" ||
        segments.some(
          (segment) => segment.startsWith(".") || segment === "node_modules",
        )
      ) {
        continue
      }
      const content = await ky
        .get("package_files/download", {
          searchParams: { package_file_id: fileId },
        })
        .arrayBuffer()
      const outputPath = path.join(staged, ...segments)
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.writeFile(outputPath, Buffer.from(content), { flag: "wx" })
    }
    if ((await fs.readdir(staged)).length === 0) {
      throw new Error("No source files in the published release")
    }
    await fs.writeFile(
      path.join(staged, REFERENCE_DESIGN_METADATA_FILENAME),
      JSON.stringify({ name, package_release_id: releaseId }, null, 2) + "\n",
    )
    if (await pathExists(destination)) return
    await fs.rename(staged, destination)
    console.log(
      `Imported reference design ${name} to ${path.relative(projectDir, destination)}`,
    )
  } finally {
    await fs.rm(staged, { recursive: true, force: true })
  }
}

/** Returns whether at least one matching source snapshot is available locally. */
export async function importReferenceDesigns(
  manufacturerPartNumber: string | undefined,
  projectDir = process.cwd(),
): Promise<boolean> {
  if (!manufacturerPartNumber?.trim()) return false
  const partNumber = normalizePartNumber(manufacturerPartNumber)
  const catalogBaseUrl = getPartsEngineBaseUrl(
    "reference-design-catalog",
    "https://tscircuit.com",
  )
  let names: string[]
  try {
    const response = await getPlatformFetch()(
      `${catalogBaseUrl}/reference-design-packages.json`,
      { signal: AbortSignal.timeout(5_000) },
    )
    if (response.status === 404 || response.status === 405) return false
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (!response.headers.get("Content-Type")?.includes("application/json"))
      return false
    names = catalogSchema.parse(await response.json()).packages
  } catch (error) {
    if (!(error instanceof BakedAssetNotFoundError)) {
      console.warn(
        `Could not load reference designs: ${getErrorMessage(error)}`,
      )
    }
    return false
  }

  const ky = getRegistryApiKy({ sessionToken: "" }).extend({
    retry: 0,
    timeout: 5_000,
  })
  let hasReferenceDesigns = false
  for (const name of new Set(names)) {
    try {
      const { package: pkg } = await ky
        .get("packages/get", { searchParams: { name } })
        .json<{
          package: { is_private: boolean; last_built_release_id: string | null }
        }>()
      const releaseId = pkg.last_built_release_id
      if (pkg.is_private || !releaseId) continue
      const { package_file } = await ky
        .get("package_files/get", {
          searchParams: {
            package_release_id: releaseId,
            file_path: "dist/preview.json",
          },
        })
        .json<{ package_file: { content_text: string } }>()
      const manifest = manifestSchema.parse(
        JSON.parse(package_file.content_text),
      )
      if (
        manifest.componentPartNumbers.some(
          (mpn) => normalizePartNumber(mpn) === partNumber,
        )
      ) {
        await downloadReferenceDesign({ ky, name, releaseId, projectDir })
        hasReferenceDesigns = true
      }
    } catch (error) {
      console.warn(
        `Could not import reference design ${name}: ${getErrorMessage(error)}`,
      )
    }
  }
  return hasReferenceDesigns
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)
