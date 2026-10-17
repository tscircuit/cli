import { cliConfig, getSessionToken } from "lib/cli-config"
import { fetchAccount } from "lib/registry-api/fetch-account"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import semver from "semver"
import Debug from "debug"
import kleur from "kleur"
import { getEntrypoint } from "./get-entrypoint"
import prompts from "lib/utils/prompts"
import { getUnscopedPackageName } from "lib/utils/get-unscoped-package-name"
import { getPackageAuthor } from "lib/utils/get-package-author"
import { validatePackageName } from "lib/utils/validate-package-name"
import { getPackageFilePaths } from "lib/dev/get-package-file-paths"
import { isBinaryFile } from "./is-binary-file"
import { hasBinaryContent } from "./has-binary-content"
import { gzipSync } from "node:zlib"

type PushOptions = {
  filePath?: string
  versionTag?: string
  includeDist?: boolean
  compress?: boolean
  log?: (message: string) => void
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

const debug = Debug("tsci:push-snippet")

const findPushProject = async ({
  filePath,
  onError,
}: {
  filePath?: string
  onError: (message: string) => void
}): Promise<{
  snippetFilePath?: string
  packageJsonPath?: string
  projectDir: string
} | null> => {
  if (filePath) {
    const snippetFilePath = await getEntrypoint({
      filePath,
      onSuccess: () => {},
      onError,
    })

    if (!snippetFilePath) {
      return null
    }

    const packageJsonPath = [
      path.resolve(path.join(path.dirname(snippetFilePath), "package.json")),
      path.resolve(path.join(process.cwd(), "package.json")),
    ].find((candidatePath) => fs.existsSync(candidatePath))
    const projectDir = packageJsonPath
      ? path.dirname(packageJsonPath)
      : path.dirname(snippetFilePath)

    return { snippetFilePath, packageJsonPath, projectDir }
  }

  const projectDir = process.cwd()
  const packageJsonPath = path.resolve(path.join(projectDir, "package.json"))
  if (!fs.existsSync(packageJsonPath)) {
    return { projectDir }
  }

  const snippetFilePath =
    (await getEntrypoint({
      projectDir,
      onSuccess: () => {},
      onError: () => {},
    })) ?? undefined

  return { snippetFilePath, packageJsonPath, projectDir }
}

export const getArchivePayload = (
  filePaths: string[],
  projectDir: string,
  packageNameWithVersion: string,
) => {
  const files = filePaths.map((fullFilePath) => {
    const relativeFilePath = path.relative(projectDir, fullFilePath)
    const fileBuffer = fs.readFileSync(fullFilePath)
    const isBinary =
      isBinaryFile(relativeFilePath) || hasBinaryContent(fileBuffer)

    return isBinary
      ? {
          file_path: relativeFilePath,
          content_base64: fileBuffer.toString("base64"),
        }
      : {
          file_path: relativeFilePath,
          content_text: fileBuffer.toString("utf8"),
        }
  })
  const archive = gzipSync(JSON.stringify({ files }), { level: 9 })

  return {
    package_name_with_version: packageNameWithVersion,
    archive_base64: archive.toString("base64"),
  }
}

const normalizeManifestFilePath = (filePath: string) =>
  filePath
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")

const isAmbiguousArchiveUploadError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false
  const err = error as {
    status?: number
    response?: { status?: number }
  }
  const status = err.status ?? err.response?.status
  if (typeof status === "number") {
    return status === 408 || status >= 500
  }
  return true
}

const reconcileArchiveUpload = async ({
  ky,
  filePaths,
  projectDir,
  packageNameWithVersion,
}: {
  ky: ReturnType<typeof getRegistryApiKy>
  filePaths: string[]
  projectDir: string
  packageNameWithVersion: string
}): Promise<Set<string>> => {
  const verifiedRelativePaths = new Set<string>()

  try {
    const listResponse = await ky
      .get<{
        package_files?: Array<{
          package_file_id?: string
          file_path: string
          content_text?: string | null
          content_base64?: string | null
          is_text?: boolean
        }>
      }>("package_files/list", {
        searchParams: {
          package_name_with_version: packageNameWithVersion,
        },
      })
      .json()

    const remoteFiles = listResponse.package_files ?? []
    if (remoteFiles.length === 0) {
      return verifiedRelativePaths
    }

    const remoteFilesByPath = new Map<string, (typeof remoteFiles)[number]>()
    for (const remoteFile of remoteFiles) {
      remoteFilesByPath.set(
        normalizeManifestFilePath(remoteFile.file_path),
        remoteFile,
      )
    }

    for (const fullFilePath of filePaths) {
      const relativeFilePath = path.relative(projectDir, fullFilePath)
      const normalizedPath = normalizeManifestFilePath(relativeFilePath)
      const remoteFile = remoteFilesByPath.get(normalizedPath)
      if (!remoteFile) continue

      const fileBuffer = fs.readFileSync(fullFilePath)
      const isBinary =
        isBinaryFile(relativeFilePath) || hasBinaryContent(fileBuffer)

      const lookupSearchParams: Record<string, string> =
        remoteFile.package_file_id
          ? { package_file_id: remoteFile.package_file_id }
          : {
              package_name_with_version: packageNameWithVersion,
              file_path: remoteFile.file_path,
            }

      let remoteText = remoteFile.content_text
      let remoteBase64 = remoteFile.content_base64
      let packageFileId = remoteFile.package_file_id

      if (remoteText == null && remoteBase64 == null) {
        try {
          const getResponse = await ky
            .get<{
              package_file?: {
                package_file_id?: string
                content_text?: string | null
                content_base64?: string | null
                is_text?: boolean
              }
            }>("package_files/get", {
              searchParams: lookupSearchParams,
            })
            .json()
          remoteText = getResponse.package_file?.content_text
          remoteBase64 = getResponse.package_file?.content_base64
          packageFileId =
            getResponse.package_file?.package_file_id ?? packageFileId
        } catch {
          continue
        }
      }

      if (!isBinary) {
        const expectedText = fileBuffer.toString("utf8")
        if (typeof remoteText === "string") {
          if (remoteText === expectedText) {
            verifiedRelativePaths.add(relativeFilePath)
          }
          continue
        }
      } else if (typeof remoteBase64 === "string") {
        if (Buffer.from(remoteBase64, "base64").equals(fileBuffer)) {
          verifiedRelativePaths.add(relativeFilePath)
        }
        continue
      }

      try {
        const downloadSearchParams: Record<string, string> = packageFileId
          ? { package_file_id: packageFileId }
          : {
              package_name_with_version: packageNameWithVersion,
              file_path: remoteFile.file_path,
            }
        const downloadedBytes = Buffer.from(
          await ky
            .get("package_files/download", {
              searchParams: downloadSearchParams,
            })
            .arrayBuffer(),
        )
        if (downloadedBytes.equals(fileBuffer)) {
          verifiedRelativePaths.add(relativeFilePath)
        }
      } catch {
        continue
      }
    }
  } catch (reconcileError) {
    debug("reconcileArchiveUpload failed", reconcileError)
  }

  return verifiedRelativePaths
}

export const pushSnippet = async ({
  filePath,
  versionTag,
  includeDist = false,
  compress = true,
  log = console.log,
  onExit = (code) => process.exit(code),
  onError = (message) => console.error(message),
  onSuccess = (message) => console.log(message),
}: PushOptions) => {
  const sessionToken = getSessionToken()
  if (!sessionToken) {
    onError(
      "You need to log in to save package. Run 'tsci login' to authenticate.",
    )
    return onExit(1)
  }

  const pushProject = await findPushProject({
    filePath,
    onError,
  })

  if (!pushProject) {
    return onExit(1)
  }

  const { snippetFilePath, packageJsonPath, projectDir } = pushProject

  if (!packageJsonPath) {
    onError(
      "No package.json found, try running 'tsci init' to bootstrap the project",
    )
    return onExit(1)
  }

  let packageJson: {
    name?: string
    author?: string
    version?: string
    license?: string
  } = {}
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
    } catch {
      onError("Invalid package.json")
      return onExit(1)
    }
  }

  if (snippetFilePath && !fs.existsSync(snippetFilePath)) {
    onError(`File not found: ${snippetFilePath}`)
    return onExit(1)
  }

  const ky = getRegistryApiKy({ sessionToken })
  const currentUsername = process.env.TSCIRCUIT_TOKEN
    ? (await fetchAccount())?.tscircuit_handle
    : cliConfig.get("tscircuitHandle")
  if (!currentUsername) {
    onError("You need to set your tscircuit handle to publish packages")
    return onExit(1)
  }
  let unscopedPackageName = getUnscopedPackageName(packageJson.name ?? "")
  const packageJsonAuthor = getPackageAuthor(packageJson.name ?? "")

  // Validate the unscoped package name if it already exists
  if (unscopedPackageName) {
    const validationError = validatePackageName(unscopedPackageName)
    if (validationError) {
      onError(
        `Invalid package name "${unscopedPackageName}": ${validationError}\n` +
          `Please fix the package name in: ${packageJsonPath}`,
      )
      return onExit(1)
    }
  }

  const packageJsonHasName = Boolean(packageJson.name)
  if (!packageJsonHasName) {
    console.log(kleur.gray("No package name found in package.json"))
    let inputName: string
    ;({ unscopedPackageName: inputName } = await prompts({
      type: "text",
      name: "unscopedPackageName",
      message: `Enter the unscoped package name:`,
      instructions: `Your package will be published as "@tsci/${currentUsername}.<unscoped package name>"`,
    }))

    if (!inputName) {
      onError("Package name is required")
      return onExit(1)
    }

    // Validate the package name
    const validationError = validatePackageName(inputName)
    if (validationError) {
      onError(`Invalid package name: ${validationError}`)
      return onExit(1)
    }

    unscopedPackageName = inputName

    // Write the package name to the package.json file
    packageJson.name = `@tsci/${currentUsername}.${unscopedPackageName}`
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  }

  // The registry authorizes package/release creation and uploads. Organization
  // administration is not required to publish an organization's packages.
  const accountName = packageJsonAuthor || currentUsername

  if (packageJsonAuthor && currentUsername !== packageJsonAuthor) {
    log(
      kleur.gray(
        `Publishing to org "${packageJsonAuthor}" (user: ${currentUsername})`,
      ),
    )
  }

  const scopedPackageName = `${accountName}/${unscopedPackageName}`
  const tsciPackageName = `@tsci/${accountName}.${unscopedPackageName}`

  const previousPackageReleases = await ky
    .post<{
      error?: { error_code: string }
      package_releases?: { version: string; is_latest: boolean }[]
    }>("package_releases/list", {
      json: { package_name: scopedPackageName },
    })
    .json()
    .then((response) => response.package_releases)

  const lastKnownVersion =
    packageJson.version ??
    previousPackageReleases?.[previousPackageReleases.length - 1]?.version

  let packageVersion: string
  if (!lastKnownVersion) {
    console.log(
      "No package version found in package.json or previous releases, setting to 0.0.1",
    )
    packageVersion = "0.0.1"
  } else {
    packageVersion = lastKnownVersion
  }

  const updatePackageJsonVersion = (newVersion?: string) => {
    try {
      packageJson.version = newVersion ?? `${packageVersion}`
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    } catch (error) {
      onError(`Failed to update package.json version: ${error}`)
    }
  }

  const doesPackageExist = await ky
    .post<{ error?: { error_code: string } }>("packages/get", {
      json: { name: scopedPackageName },
    })
    .json()
    .then((response) => {
      debug("doesPackageExist", response)
      return true
    })
    .catch((error) => {
      // Package not found
      if (error.response.status === 404) {
        return false
      }
    })

  if (!doesPackageExist) {
    const { createPackage, visibility } = await prompts([
      {
        type: "confirm",
        name: "createPackage",
        initial: true,
        message: `Package "${tsciPackageName}" does not exist. Create it?`,
      },
      {
        name: "visibility",
        type: "select",
        message: "Package Visibility:",
        choices: [
          { title: "Public", value: "public", selected: true },
          { title: "Private", value: "private" },
        ],
      },
    ])
    if (!createPackage || !visibility) {
      onError(`aborted`)
      return onExit(1)
    }

    await ky
      .post("packages/create", {
        json: {
          name: scopedPackageName,
          is_private: visibility === "private",
        },
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      .json()
      .then((response) => {
        debug("createPackage", response)
        log(`Package created`)
      })
      .catch((error) => {
        onError(`Error creating package: ${error}`)
        return onExit(1)
      })
  }

  const buildReleaseVersion = (baseVersion: string) =>
    versionTag ? `${baseVersion}-${versionTag}` : baseVersion

  let releaseVersion = buildReleaseVersion(packageVersion)

  while (true) {
    const releaseExists = await ky
      .post<{
        error?: { error_code: string }
        package_release?: { version: string }
      }>("package_releases/get", {
        json: {
          package_name_with_version: `${scopedPackageName}@${releaseVersion}`,
        },
      })
      .json()
      .then((response) => {
        debug("doesReleaseExist", response)
        if (response.package_release?.version) {
          return true
        }
        return !(response.error?.error_code === "package_release_not_found")
      })
      .catch((error: unknown) => {
        const httpError = error as { response?: { status?: number } }
        // Package release not found
        if (httpError?.response?.status === 404) {
          return false
        }
        onError(`Error checking if release exists: ${error}`)
        return undefined
      })

    if (releaseExists === undefined) {
      return onExit(1)
    }

    if (!releaseExists) {
      break
    }

    const bumpedVersion = semver.inc(packageVersion, "patch")
    if (!bumpedVersion) {
      onError(`Failed to increment version from ${packageVersion}`)
      return onExit(1)
    }

    log(`Incrementing Package Version ${packageVersion} -> ${bumpedVersion}`)
    packageVersion = bumpedVersion
    updatePackageJsonVersion(packageVersion)
    releaseVersion = buildReleaseVersion(packageVersion)
  }

  try {
    await ky.post("package_releases/create", {
      json: {
        package_name_with_version: `${scopedPackageName}@${releaseVersion}`,
      },
    })
  } catch (error) {
    onError(`Error creating release: ${error}`)
    return onExit(1)
  }

  const filePaths = getPackageFilePaths(
    projectDir,
    includeDist ? [] : ["**/dist/**"],
  )
  const uploadResults: {
    succeeded: string[]
    failed: { file: string; error: string }[]
  } = { succeeded: [], failed: [] }

  const packageNameWithVersion = `${scopedPackageName}@${releaseVersion}`
  let remainingFilePaths = [...filePaths]
  if (compress) {
    log(kleur.gray("Uploading package archive..."))
    try {
      const archivePayload = getArchivePayload(
        filePaths,
        projectDir,
        packageNameWithVersion,
      )
      const configuredArchiveTimeout = Number(
        process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS,
      )
      await ky.post("package_files/upload_archive", {
        json: archivePayload,
        ...(Number.isFinite(configuredArchiveTimeout) &&
        configuredArchiveTimeout > 0
          ? { timeout: configuredArchiveTimeout }
          : {}),
      })
      for (const fullFilePath of filePaths) {
        const relativeFilePath = path.relative(projectDir, fullFilePath)
        uploadResults.succeeded.push(relativeFilePath)
      }
      remainingFilePaths = []
      log(kleur.gray(`📦 Uploaded archive with ${filePaths.length} files`))
    } catch (error) {
      if (isAmbiguousArchiveUploadError(error)) {
        const verifiedRelativePaths = await reconcileArchiveUpload({
          ky,
          filePaths,
          projectDir,
          packageNameWithVersion,
        })
        for (const fullFilePath of filePaths) {
          const relativeFilePath = path.relative(projectDir, fullFilePath)
          if (verifiedRelativePaths.has(relativeFilePath)) {
            uploadResults.succeeded.push(relativeFilePath)
          }
        }
        remainingFilePaths = filePaths.filter(
          (fullFilePath) =>
            !verifiedRelativePaths.has(path.relative(projectDir, fullFilePath)),
        )
      }

      if (remainingFilePaths.length === 0) {
        log(kleur.gray(`📦 Uploaded archive with ${filePaths.length} files`))
      } else {
        log(
          kleur.yellow(
            `Archive upload failed, falling back to file-by-file upload: ${error}`,
          ),
        )
      }
    }
  }

  if (remainingFilePaths.length > 0) {
    for (const fullFilePath of remainingFilePaths) {
      const relativeFilePath = path.relative(projectDir, fullFilePath)

      // Check if file is binary by extension first, then by content if needed
      const fileBuffer = fs.readFileSync(fullFilePath)
      const isBinary =
        isBinaryFile(relativeFilePath) || hasBinaryContent(fileBuffer)

      // Build the request payload based on whether the file is binary or text
      const payload: {
        file_path: string
        package_name_with_version: string
        content_text?: string
        content_base64?: string
      } = {
        file_path: relativeFilePath,
        package_name_with_version: packageNameWithVersion,
      }

      if (isBinary) {
        payload.content_base64 = fileBuffer.toString("base64")
      } else {
        payload.content_text = fileBuffer.toString("utf-8")
      }

      await ky
        .post("package_files/create", {
          json: payload,
        })
        .then(() => {
          const icon = isBinary ? "📦" : "⬆︎"
          console.log(kleur.gray(`${icon} ${relativeFilePath}`))
          uploadResults.succeeded.push(relativeFilePath)
        })
        .catch(async (error) => {
          const errorDetails = String(error)?.split(`\n\nRequest Body:`)?.[0]
          console.log(kleur.red(`  ${relativeFilePath} - failed`))
          uploadResults.failed.push({
            file: relativeFilePath,
            error: errorDetails,
          })
        })
    }
  }

  log("\n")
  log(kleur.bold("Upload Summary"))
  log(kleur.green(`  Succeeded: ${uploadResults.succeeded.length} files`))
  if (uploadResults.failed.length > 0) {
    log(kleur.red(`  Failed: ${uploadResults.failed.length} files`))
    for (const { file, error } of uploadResults.failed) {
      log(kleur.red(`    - ${file}`))
      log(kleur.gray(`      ${error}`))
    }
  }
  if (uploadResults.failed.length > 0 && uploadResults.succeeded.length === 0) {
    onError(
      `\nPublish completed with ${uploadResults.failed.length} failed upload(s)`,
    )
    return onExit(1)
  }

  if (uploadResults.failed.length > 0 && uploadResults.succeeded.length > 0) {
    onSuccess(
      `\nPublish completed with ${uploadResults.succeeded.length} files uploaded and ${uploadResults.failed.length} failed upload(s)`,
    )
    return onExit(1)
  }
  await ky.post("package_releases/update", {
    json: {
      package_name_with_version: `${scopedPackageName}@${releaseVersion}`,
      ready_to_build: true,
      ...(typeof packageJson.license === "string" && packageJson.license.trim()
        ? { license: packageJson.license.trim() }
        : {}),
    },
  })

  onSuccess(
    [
      "\n",
      kleur.bold().green(`"${tsciPackageName}@${releaseVersion}" published!`),
      kleur.underline(kleur.blue(`https://tscircuit.com/${scopedPackageName}`)),
    ].join("\n"),
  )

  return onExit(0)
}
