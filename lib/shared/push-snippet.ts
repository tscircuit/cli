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

type PushOptions = {
  filePath?: string
  isPrivate?: boolean
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

const debug = Debug("tsci:push-snippet")

export const pushSnippet = async ({
  filePath,
  isPrivate,
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
    onSuccess,
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

  if (currentUsername !== packageJsonAuthor) {
    console.warn("Package author does not match the logged in GitHub username")
    // TODO check for org access for user
  }

  const scopedPackageName = `${currentUsername}/${unscopedPackageName}`
  const tsciPackageName = `@tsci/${currentUsername}.${unscopedPackageName}`

  const previousPackageReleases = await ky
    .post<{
      error?: { error_code: string }
      package_releases?: { version: string; is_latest: boolean }[]
    }>("package_releases/list", {
      json: { package_name: scopedPackageName },
    })
    .json()
    .then((response) => response.package_releases)

  let packageVersion =
    packageJson.version ??
    previousPackageReleases?.[previousPackageReleases.length - 1]?.version

  if (!packageVersion) {
    console.log(
      "No package version found in package.json or previous releases, setting to 0.0.1",
    )
    packageVersion = "0.0.1"
  }

  const updatePackageJsonVersion = (newVersion?: string) => {
    if (packageJson.version) {
      try {
        packageJson.version = newVersion ?? `${packageVersion}`
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
      } catch (error) {
        onError(`Failed to update package.json version: ${error}`)
      }
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
    const { createPackage, visibility, snippetType } = await prompts([
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
      {
        name: "snippetType",
        type: "select",
        message: "Package Type:",
        choices: [
          { title: "Reusable Package", value: "package", selected: true },
          { title: "Board", value: "board" },
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
          is_snippet: true,
          snippet_type: snippetType,
        },
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      .json()
      .then((response) => {
        debug("createPackage", response)
        onSuccess(`Package created`)
      })
      .catch((error) => {
        onError(`Error creating package: ${error}`)
        return onExit(1)
      })
  }

  const doesReleaseExist = await ky
    .post<{
      error?: { error_code: string }
      package_release?: { version: string }
    }>("package_releases/get", {
      json: {
        package_name_with_version: `${scopedPackageName}@${packageVersion}`,
      },
    })
    .json()
    .then((response) => {
      debug("doesReleaseExist", response)
      if (response.package_release?.version) {
        packageVersion = response.package_release.version
        updatePackageJsonVersion(response.package_release.version)
        return true
      }
      return !(response.error?.error_code === "package_release_not_found")
    })
    .catch((error) => {
      // Package release not found
      if (error.response.status === 404) {
        return false
      }
      onError(`Error checking if release exists: ${error}`)
    })

  if (doesReleaseExist) {
    const bumpedVersion = semver.inc(packageVersion, "patch")!
    onSuccess(
      `Incrementing Package Version ${packageVersion} -> ${bumpedVersion}`,
    )
    packageVersion = bumpedVersion
    updatePackageJsonVersion(packageVersion)
  }

  await ky
    .post("package_releases/create", {
      json: {
        package_name_with_version: `${scopedPackageName}@${packageVersion}`,
      },
    })
    .catch((error) => {
      onError(`Error creating release: ${error}`)
      return onExit(1)
    })

  onSuccess("\n")

  const filePaths = getPackageFilePaths(projectDir)
  for (const fullFilePath of filePaths) {
    const relativeFilePath = path.relative(projectDir, fullFilePath)
    const fileContent = fs.readFileSync(fullFilePath, "utf-8")
    await ky
      .post("package_files/create", {
        json: {
          file_path: relativeFilePath,
          content_text: fileContent,
          package_name_with_version: `${scopedPackageName}@${packageVersion}`,
        },
      })
      .json()
      .then((response) => {
        console.log(kleur.gray(`⬆︎ ${relativeFilePath}`))
      })
      .catch((error) => {
        onError(`Error uploading file ${fullFilePath}: ${error}`)
        return onExit(1)
      })
  }

  await ky
    .post("package_releases/update", {
      json: {
        package_name_with_version: `${scopedPackageName}@${packageVersion}`,
        ready_to_build: true,
      },
    })
    .catch((error) => {
      onError(`Error setting ready_to_build: ${error}`)
      return onExit(1)
    })

  onSuccess(
    [
      kleur.green(`"${tsciPackageName}@${packageVersion}" published!`),
      `https://tscircuit.com/${scopedPackageName}`,
    ].join("\n"),
  )
}
