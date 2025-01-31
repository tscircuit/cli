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
        console.error("❌ You need to log in to save a snippet.")
        process.exit(1)
      }

      let snippetFilePath: string | null = null
      if (filePath) {
        snippetFilePath = path.resolve(filePath)
      } else {
        const defaultEntrypoint = path.resolve("index.tsx")
        if (fs.existsSync(defaultEntrypoint)) {
          snippetFilePath = defaultEntrypoint
          console.log(
            "ℹ️ No file provided. Using 'index.tsx' as the entrypoint.",
          )
        } else {
          console.error(
            "❌ No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
          )
          process.exit(1)
        }
      }

      let packageJson: { name?: string; author?: string; version?: string } = {}
      const packageJsonPath = path.resolve(
        path.dirname(snippetFilePath),
        "package.json",
      )
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
      }

      if (!fs.existsSync(snippetFilePath)) {
        console.error(`❌ File not found: ${snippetFilePath}`)
        process.exit(1)
      }

      const ky = getKy()
      const packageName = (
        packageJson.name ?? path.parse(snippetFilePath).name
      ).replace(/^@/, "")
      const packageAuthor = await (async (): Promise<string> => {
        try {
          const response = await ky
            .get<{ account: { github_username: string } }>("accounts/get", {
              headers: { Authorization: `Bearer ${sessionToken}` },
            })
            .json()
          return response.account.github_username
        } catch (error) {
          console.error(
            "❌ Failed to fetch information about the account:",
            error,
          )
          process.exit(1)
        }
      })()
      const packageIdentifier = `${packageAuthor}/${packageName}`
      let packageVersion = packageJson.version ?? "0.0.1"

      const updatePackageJsonVersion = (newVersion?: string) => {
        if (packageJson.version) {
          try {
            packageJson.version = newVersion ?? packageVersion
            fs.writeFileSync(
              packageJsonPath,
              JSON.stringify(packageJson, null, 2),
            )
          } catch (error) {
            console.error("⚠️ Failed to update package.json version:", error)
          }
        }
      }

      const existingPackage = await ky
        .post<{ error?: { error_code: string } }>("packages/get", {
          json: { name: packageIdentifier },
          throwHttpErrors: false,
        })
        .json()

      const doesPackageExist = !(
        existingPackage.error?.error_code === "package_not_found"
      )

      if (!doesPackageExist) {
        try {
          await ky.post("packages/create", {
            json: { name: packageIdentifier },
            headers: { Authorization: `Bearer ${sessionToken}` },
          })
          console.log(`✅ Created package: ${packageIdentifier}`)
        } catch (error) {
          console.error("❌ Error while creating package:", error)
          process.exit(1)
        }
      }

      const doesReleaseExist = await (async () => {
        const existingRelease = await ky
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
        if (existingRelease.package_release?.version) {
          packageVersion = existingRelease.package_release.version
          updatePackageJsonVersion(existingRelease.package_release.version)
        }

        return !(
          existingRelease.error?.error_code === "package_release_not_found"
        )
      })()

      if (doesReleaseExist) {
        const bumpedVersion =
          semver.inc(packageVersion, "minor") ??
          (parseFloat(packageVersion) + 0.1).toString()
        console.log(
          `⬆️ Incrementing Package Version ${packageVersion} -> ${bumpedVersion}`,
        )
        packageVersion = bumpedVersion
        updatePackageJsonVersion(packageVersion)
      }

      try {
        await ky.post("package_releases/create", {
          json: {
            package_name_with_version: `${packageIdentifier}@${packageVersion}`,
          },
          throwHttpErrors: false,
        })
        console.log(`✅ Created release for version: ${packageVersion}`)
      } catch (error: any) {
        console.error("❌ Error while creating package release:", error.message)
        process.exit(1)
      }

      console.log("\n")

      const directoryFiles = fs.readdirSync(path.dirname(snippetFilePath))
      for (const file of directoryFiles) {
        const fileExtension = path.extname(file).replace(".", "")
        if (!["json", "tsx", "ts"].includes(fileExtension)) continue

        const fileContent =
          fs
            .readFileSync(path.join(path.dirname(snippetFilePath), file))
            .toString() ?? ""
        try {
          await ky.post("package_files/create", {
            json: {
              file_path: file,
              content_text: fileContent,
              package_name_with_version: `${packageIdentifier}@${packageVersion}`,
            },
            throwHttpErrors: false,
          })
          console.log(`📦 Uploaded file: ${file}`)
        } catch (error) {
          console.error(`❌ Failed to upload file: ${file}`, error)
        }
      }

      console.log(
        `\n🎉 Successfully pushed snippet to the registry!${Bun.color("blue", "ansi")}`,
        `https://registry.tscircuit.com/${packageIdentifier}`,
        "\x1b[0m",
      )
    })
}
