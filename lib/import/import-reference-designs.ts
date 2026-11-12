import fs from "node:fs/promises"
import path from "node:path"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { BakedAssetNotFoundError } from "lib/shared/get-platform-fetch"
import {
  REFERENCE_DESIGNS_DIRECTORY,
  REFERENCE_DESIGN_METADATA_FILENAME,
} from "lib/shared/reference-design-paths"
import { z } from "zod"

const lookupSchema = z.object({
  reference_designs: z.array(
    z.object({
      name: z.string().regex(/^[\w-]+\/[\w-]+$/),
      package_release_id: z.string().uuid(),
    }),
  ),
})

export type ReferenceDesign = z.infer<
  typeof lookupSchema
>["reference_designs"][number]

const getReferenceDesignApi = () =>
  getRegistryApiKy({ sessionToken: "" }).extend({
    retry: 0,
    timeout: 5_000,
  })

type RegistryApi = ReturnType<typeof getReferenceDesignApi>

export async function getReferenceDesigns(
  manufacturerPartNumber: string | null | undefined,
): Promise<ReferenceDesign[]> {
  if (!manufacturerPartNumber?.trim()) return []
  try {
    const response = await getReferenceDesignApi()
      .get("datasheets/list_reference_designs", {
        searchParams: { chip_name: manufacturerPartNumber.trim() },
      })
      .json()
    return lookupSchema.parse(response).reference_designs
  } catch (error) {
    const status = (error as { status?: number })?.status
    if (
      status !== 404 &&
      status !== 405 &&
      !(error instanceof BakedAssetNotFoundError)
    ) {
      console.warn(
        `Could not load reference designs: ${getErrorMessage(error)}`,
      )
    }
    return []
  }
}

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
  componentDir,
}: {
  ky: RegistryApi
  name: string
  releaseId: string
  componentDir: string
}) {
  const root = path.join(componentDir, REFERENCE_DESIGNS_DIRECTORY)
  const destination = path.join(root, name.replace("/", "."))
  await ensureDirectory(path.dirname(componentDir))
  await ensureDirectory(componentDir)
  await ensureDirectory(root)
  if (await pathExists(destination)) return

  const { package_files: files } = await ky
    .get("package_files/list", {
      searchParams: { package_release_id: releaseId },
    })
    .json<{ package_files: { file_path: string; package_file_id: string }[] }>()
  const staged = await fs.mkdtemp(path.join(root, ".import-"))
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
      `Imported reference design ${name} to ${path.relative(process.cwd(), destination)}`,
    )
  } finally {
    await fs.rm(staged, { recursive: true, force: true })
  }
}

export async function saveReferenceDesigns(
  referenceDesigns: ReferenceDesign[],
  componentDir: string,
) {
  if (referenceDesigns.length === 0) return
  const ky = getReferenceDesignApi()
  for (const { name, package_release_id: releaseId } of referenceDesigns) {
    try {
      await downloadReferenceDesign({ ky, name, releaseId, componentDir })
    } catch (error) {
      console.warn(
        `Could not import reference design ${name}: ${getErrorMessage(error)}`,
      )
    }
  }
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)
