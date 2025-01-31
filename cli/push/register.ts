import type { Command } from "commander"
import { cliConfig } from "lib/cli-config"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import semver from "semver"

export const registerPush = (program: Command) => {
  program
    .command("push")
    .description("Save snippet code to Registry API")
    .argument("[file]", "Path to the snippet file")
    .action(async (filePath?: string) => {
      const sessionToken = cliConfig.get("sessionToken")
      if (!sessionToken) {
        console.error("You need to log in to save snippet.")
        process.exit(1)
      }

      let snippetFilePath: string | null = null
      if (filePath) {
        snippetFilePath = path.resolve(filePath)
      } else {
        const defaultEntrypoint = path.resolve("index.tsx")
        if (fs.existsSync(defaultEntrypoint)) {
          snippetFilePath = defaultEntrypoint
          console.log("No file provided. Using 'index.tsx' as the entrypoint.")
        } else {
          console.error(
            "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
          )
          process.exit(1)
        }
      }

      const packageJsonPath = path.resolve(
        path.join(path.dirname(snippetFilePath), "package.json"),
      )
      let packageJson: { name?: string; author?: string; version?: string } = {}
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
      }

      if (!fs.existsSync(snippetFilePath)) {
        console.error(`File not found: ${snippetFilePath}`)
        process.exit(1)
      }

      const ky = getKy()
      const packageName = (
        packageJson.name ?? path.parse(snippetFilePath).name
      ).replace(/^@/, "")
      const packageAuthor =
        packageJson.author?.split(" ")[0] ??
        (await ky
          .get<{ account: { github_username: string } }>("accounts/get", {
            headers: { Authorization: `Bearer ${sessionToken}` },
          })
          .json()
          .then((response) => response.account.github_username)
          .catch((error) => {
            console.error("Failed to fetch package author information:", error)
            process.exit(1)
          }))

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
            console.error("Failed to retrieve latest package version:", error)
            process.exit(1)
          }))

      if (!packageVersion) {
        console.log("Failed to retrieve package version.")
        process.exit(1)
      }

      const updatePackageJsonVersion = (newVersion?: string) => {
        if (packageJson.version) {
          try {
            packageJson.version = newVersion ?? packageVersion
            fs.writeFileSync(
              packageJsonPath,
              JSON.stringify(packageJson, null, 2),
            )
          } catch (error) {
            console.error("Failed to update package.json version:", error)
          }
        }
      }

      const doesPackageExist = await ky
        .post<{ error?: { error_code: string } }>("packages/get", {
          json: { name: packageIdentifier },
          throwHttpErrors: false,
        })
        .json()
        .then(
          (response) => !(response.error?.error_code === "package_not_found"),
        )
        .catch((error) => {
          console.error("Error checking if package exists:", error)
          process.exit(1)
        })

      if (!doesPackageExist) {
        await ky
          .post("packages/create", {
            json: { name: packageIdentifier },
            headers: { Authorization: `Bearer ${sessionToken}` },
          })
          .catch((error) => {
            console.error("Error creating package:", error)
            process.exit(1)
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
        .catch((error) => {
          console.error("Error checking if release exists:", error)
          process.exit(1)
        })

      if (doesReleaseExist) {
        const bumpedVersion = semver.inc(packageVersion, "patch")!
        console.log(
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
          console.error("Error creating release:", error)
          process.exit(1)
        })

      console.log("\n")

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
            console.log(`Uploaded file ${file} to the registry.`)
          })
          .catch((error) => {
            console.error(`Error uploading file ${file}:`, error)
          })
      }

      console.log(
        `\n🎉 Successfully pushed package ${packageIdentifier}@${packageVersion} to the registry!${Bun.color("blue", "ansi")}`,
        `https://tscircuit.com/${packageIdentifier} \x1b[0m`,
      )
    })
}
