import { cliConfig } from "lib/cli-config"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import semver from "semver"
import Debug from "debug"

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
      "You need to log in to save snippet. Run 'tsci login' to authenticate.",
    )
    return onExit(1)
  }

  let snippetFilePath: string | null = null
  if (filePath) {
    snippetFilePath = path.resolve(filePath)
  } else {
    const defaultEntrypoint = path.resolve("index.tsx")
    if (fs.existsSync(defaultEntrypoint)) {
      snippetFilePath = defaultEntrypoint
      onSuccess("No file provided. Using 'index.tsx' as the entrypoint.")
    } else {
      onError(
        "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
      )
      return onExit(1)
    }
  }

  const packageJsonPath = path.resolve(
    path.join(path.dirname(snippetFilePath), "package.json"),
  )
  let packageJson: { name?: string; author?: string; version?: string } = {}
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
    } catch {
      onError("Invalid package.json provided")
      return onExit(1)
    }
  }

  if (!fs.existsSync(snippetFilePath)) {
    onError(`File not found: ${snippetFilePath}`)
    return onExit(1)
  }

  const ky = getKy()
  const packageName = (
    packageJson.name ?? path.parse(snippetFilePath).name
  ).replace(/^@/, "")
  const packageAuthor =
    packageJson.author?.split(" ")[0] ?? cliConfig.get("githubUsername")
  const packageIdentifier = `${packageAuthor}/${packageName}`

  let packageVersion =
    packageJson.version ??
    (await ky
      .post<{
        error?: { error_code: string }
        package_releases?: { version: string; is_latest: boolean }[]
      }>("package_releases/list", {
        json: { package_name: packageIdentifier },
      })
      .json()
      .then(
        (response) =>
          response.package_releases?.[response.package_releases.length - 1]
            ?.version,
      )
      .catch((error) => {
        onError(`Failed to retrieve latest package version: ${error}`)
        return onExit(1)
      }))

  if (!packageVersion) {
    onError("Failed to retrieve package version.")
    return onExit(1)
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
      json: { name: packageIdentifier },
      throwHttpErrors: false,
    })
    .json()
    .then((response) => !(response.error?.error_code === "package_not_found"))

  if (!doesPackageExist) {
    await ky
      .post("packages/create", {
        json: {
          name: packageIdentifier,
          is_private: isPrivate ?? false,
        },
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      .then((response) => {
        onSuccess(`Package ${response.json()} created`)
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
        package_name_with_version: `${packageIdentifier}@${packageVersion}`,
      },
      throwHttpErrors: false,
    })
    .json()
    .then((response) => {
      if (response.package_release?.version) {
        packageVersion = response.package_release.version
        updatePackageJsonVersion(response.package_release.version)
        return true
      }
      return !(response.error?.error_code === "package_release_not_found")
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
        package_name_with_version: `${packageIdentifier}@${packageVersion}`,
      },
      throwHttpErrors: false,
    })
    .catch((error) => {
      onError(`Error creating release: ${error}`)
      return onExit(1)
    })

  onSuccess("\n")

  const directoryFiles = fs.readdirSync(path.dirname(snippetFilePath))
  for (const file of directoryFiles) {
    const fileExtension = path.extname(file).replace(".", "")
    if (!["json", "tsx", "ts"].includes(fileExtension)) continue
    const fileContent =
      fs
        .readFileSync(path.join(path.dirname(snippetFilePath), file))
        .toString() ?? ""
    await ky
      .post("package_files/create", {
        json: {
          file_path: file,
          content_text: fileContent,
          package_name_with_version: `${packageIdentifier}@${packageVersion}`,
        },
        throwHttpErrors: false,
      })
      .then(() => {
        onSuccess(`Uploaded file ${file} to the registry.`)
      })
      .catch((error) => {
        onError(`Error uploading file ${file}: ${error}`)
      })
  }

  onSuccess(
    [
      `Successfully pushed package ${packageIdentifier}@${packageVersion} to the registry!`,
      `https://tscircuit.com/${packageIdentifier}`,
    ].join(" "),
  )
}
