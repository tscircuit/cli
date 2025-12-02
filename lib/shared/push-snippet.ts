import { cliConfig } from "lib/cli-config"
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
import { getPackageFilePaths } from "cli/dev/get-package-file-paths"
import { checkOrgAccess } from "lib/utils/check-org-access"
import { isBinaryFile } from "./is-binary-file"
import { hasBinaryContent } from "./has-binary-content"

type PushOptions = {
  filePath?: string
  isPrivate?: boolean
  versionTag?: string
  log?: (message: string) => void
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

const debug = Debug("tsci:push-snippet")

export const pushSnippet = async ({
  filePath,
  isPrivate,
  versionTag,
  log = console.log,
  onExit = (code) => process.exit(code),
  onError = (message) => console.error(message),
  onSuccess = (message) => console.log(message),
}: PushOptions) => {
  const sessionToken = cliConfig.get("sessionToken")
  if (!sessionToken) {
    onError(
      "You need to log in to save package. Run 'tsci login' to authenticate.",
    )
    return onExit(1)
  }

  // Detect the entrypoint file
  const snippetFilePath = await getEntrypoint({
    filePath,
    onSuccess: () => {},
    onError,
  })

  if (!snippetFilePath) {
    return onExit(1)
  }

  const packageJsonPath = [
    path.resolve(path.join(path.dirname(snippetFilePath), "package.json")),
    path.resolve(path.join(process.cwd(), "package.json")),
  ].find((path) => fs.existsSync(path))
  const projectDir = packageJsonPath
    ? path.dirname(packageJsonPath)
    : path.dirname(snippetFilePath)

  if (!packageJsonPath) {
    onError(
      "No package.json found, try running 'tsci init' to bootstrap the project",
    )
    return onExit(1)
  }

  let packageJson: { name?: string; author?: string; version?: string } = {}
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
    } catch {
      onError("Invalid package.json")
      return onExit(1)
    }
  }

  if (!fs.existsSync(snippetFilePath)) {
    onError(`File not found: ${snippetFilePath}`)
    return onExit(1)
  }

  const ky = getRegistryApiKy({ sessionToken })
  const currentUsername = cliConfig.get("githubUsername")
  let unscopedPackageName = getUnscopedPackageName(packageJson.name ?? "")
  const packageJsonAuthor = getPackageAuthor(packageJson.name ?? "")

  const packageJsonHasName = Boolean(packageJson.name)
  if (!packageJsonHasName) {
    console.log(kleur.gray("No package name found in package.json"))
    ;({ unscopedPackageName } = await prompts({
      type: "text",
      name: "unscopedPackageName",
      message: `Enter the unscoped package name:`,
      instructions: `Your package will be published as "@tsci/${currentUsername}.<unscoped package name>"`,
    }))

    if (!unscopedPackageName) {
      onError("Package name is required")
      return onExit(1)
    }

    if (unscopedPackageName.includes("/")) {
      onError("Package name cannot contain a '/'")
      return onExit(1)
    }

    // Write the package name to the package.json file
    packageJson.name = `@tsci/${currentUsername}.${unscopedPackageName}`
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  }

  // Determine the account name to use (either user or org)
  let accountName = currentUsername
  if (packageJsonAuthor && currentUsername !== packageJsonAuthor) {
    const hasOrgAccess = await checkOrgAccess(ky, packageJsonAuthor)
    if (hasOrgAccess) {
      accountName = packageJsonAuthor
      console.log(
        kleur.gray(
          `Publishing to org "${packageJsonAuthor}" (user: ${currentUsername})`,
        ),
      )
    } else {
      onError(
        `You don't have access to the org "${packageJsonAuthor}". Either:\n` +
          `  1. Get added as a member of the "${packageJsonAuthor}" org, or\n` +
          `  2. Change the package name in package.json to use your username: "${currentUsername}/${unscopedPackageName}"`,
      )
      return onExit(1)
    }
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
          { title: "Public", value: "public", selected: !isPrivate },
          { title: "Private", value: "private", selected: isPrivate },
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

  await ky
    .post("package_releases/create", {
      json: {
        package_name_with_version: `${scopedPackageName}@${releaseVersion}`,
      },
    })
    .catch((error) => {
      onError(`Error creating release: ${error}`)
      return onExit(1)
    })

  log("\n")

  const filePaths = getPackageFilePaths(projectDir)

  for (const fullFilePath of filePaths) {
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
      package_name_with_version: `${scopedPackageName}@${releaseVersion}`,
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
      .json()
      .then((response) => {
        const icon = isBinary ? "📦" : "⬆︎"
        console.log(kleur.gray(`${icon} ${relativeFilePath}`))
      })
      .catch(async (error) => {
        // Try to get more details from the error response
        let errorDetails = ""
        try {
          const errorResponse = await error.response?.json()
          if (errorResponse?.error?.message) {
            errorDetails = `: ${errorResponse.error.message}`
          }
        } catch {
          // Ignore JSON parsing errors
        }
        onError(
          `Error uploading file "${relativeFilePath}"${errorDetails}\n` +
            `  Full path: ${fullFilePath}`,
        )
        return onExit(1)
      })
  }

  await ky.post("package_releases/update", {
    json: {
      package_name_with_version: `${scopedPackageName}@${releaseVersion}`,
      ready_to_build: true,
    },
  })

  onSuccess(
    [
      kleur.green(`"${tsciPackageName}@${releaseVersion}" published!`),
      kleur.underline(kleur.blue(`https://tscircuit.com/${scopedPackageName}`)),
    ].join("\n"),
  )

  return onExit(0)
}
