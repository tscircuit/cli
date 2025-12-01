import JSZip from "jszip"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import kleur from "kleur"
import * as fs from "node:fs"
import * as path from "node:path"
import prompts from "prompts"
import { handleExistingDirectory } from "./handle-existing-directory"

const getCommonDirectoryPrefix = (paths: string[]) => {
  if (paths.length === 0) return ""
  const splitPaths = paths.map((p) => p.split("/").filter(Boolean))
  const minLength = Math.min(
    ...splitPaths.map((parts) => (parts.length === 0 ? 0 : parts.length)),
  )
  const commonSegments: string[] = []

  for (let i = 0; i < Math.max(0, minLength - 1); i++) {
    const segment = splitPaths[0][i]
    if (!segment) break
    const allMatch = splitPaths.every((parts) => parts[i] === segment)
    if (!allMatch) break
    commonSegments.push(segment)
  }

  return commonSegments.join("/")
}

const sanitizeRelativePath = (relativePath: string) => {
  const normalizedPath = path.normalize(relativePath)
  if (!normalizedPath) return null
  if (path.isAbsolute(normalizedPath)) return null
  const segments = normalizedPath.split(path.sep)
  if (segments.some((segment) => segment === ".." || segment === "")) {
    return null
  }
  return normalizedPath
}

export const cloneBugReport = async ({
  bugReportId,
  originalCwd,
}: {
  bugReportId: string
  originalCwd: string
}) => {
  const trimmedBugReportId = bugReportId.trim()

  if (!trimmedBugReportId) {
    console.error("Bug report ID must not be empty.")
    process.exit(1)
  }

  let dirPath = path.resolve(`bug-report-${trimmedBugReportId}`)
  await handleExistingDirectory(dirPath)

  const ky = getRegistryApiKy()
  let zipBuffer: ArrayBuffer
  try {
    zipBuffer = await ky
      .get("bug_reports/download_zip", {
        searchParams: {
          bug_report_id: trimmedBugReportId,
        },
      })
      .arrayBuffer()
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as any).status === 404
    ) {
      console.error(
        `Bug report "${trimmedBugReportId}" not found. Please check the ID and try again.`,
      )
    } else {
      console.error(
        "Failed to download bug report:",
        error instanceof Error ? error.message : error,
      )
    }
    process.exit(1)
  }

  fs.mkdirSync(dirPath, { recursive: true })

  const zip = await JSZip.loadAsync(zipBuffer)
  const fileEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir,
  )
  const commonPrefix = getCommonDirectoryPrefix(
    fileEntries.map(([fileName]) => fileName),
  )

  for (const [fileName, entry] of fileEntries) {
    const prefixWithSlash = commonPrefix ? `${commonPrefix}/` : ""
    const withoutPrefix = fileName.startsWith(prefixWithSlash)
      ? fileName.slice(prefixWithSlash.length)
      : fileName
    const sanitizedRelativePath = sanitizeRelativePath(withoutPrefix)

    if (!sanitizedRelativePath) {
      console.warn(`Skipping potentially unsafe path: ${fileName}`)
      continue
    }

    const fullPath = path.join(dirPath, sanitizedRelativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    const fileContent = await entry.async("nodebuffer")
    fs.writeFileSync(fullPath, fileContent)
  }

  const packageJsonPath = path.join(dirPath, "package.json")
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
      const packageName = packageJson?.name

      if (typeof packageName === "string" && packageName.trim()) {
        const sanitizedName = packageName.replace(/[^a-zA-Z0-9]/g, "_")
        const suggestedDirPath = path.resolve(
          `${sanitizedName}_${trimmedBugReportId.slice(7)}`,
        )

        if (suggestedDirPath !== dirPath) {
          const response = await prompts({
            type: "confirm",
            name: "rename",
            initial: true,
            message: `Rename the directory to "${path.basename(suggestedDirPath)}"?`,
          })

          if (response.rename) {
            await handleExistingDirectory(suggestedDirPath)
            fs.renameSync(dirPath, suggestedDirPath)
            dirPath = suggestedDirPath
          }
        }
      }
    } catch (error) {
      console.warn("Unable to read package name for renaming:", error)
    }
  }

  fs.writeFileSync(
    path.join(dirPath, ".npmrc"),
    "@tsci:registry=https://npm.tscircuit.com",
  )

  generateTsConfig(dirPath)

  const relativeDirPath = path.relative(originalCwd, dirPath)

  console.log(kleur.green("\nSuccessfully cloned bug report to:"))
  console.log(`  ${dirPath}/\n`)
  console.log(kleur.bold("Start reviewing:"))
  console.log(kleur.cyan(`  cd ${relativeDirPath}`))
  console.log(kleur.cyan("  tsci dev\n"))
}
