import * as fs from "node:fs"
import * as path from "node:path"
import type { Command } from "commander"
import kleur from "kleur"
import { cliConfig } from "lib/cli-config"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { getPackageManager } from "lib/shared/get-package-manager"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { writeFileIfNotExists } from "lib/shared/write-file-if-not-exists"
import { cloneBugReport } from "./clone-bug-report"
import { handleExistingDirectory } from "./handle-existing-directory"

export const registerClone = (program: Command) => {
  program
    .command("clone")
    .description("Clone a package from the registry")
    .argument(
      "[package]",
      "Package to clone (e.g. author/packageName, author/packageName@1.2.3, or https://tscircuit.com/author/packageName)",
    )
    .option("-a, --include-author", "Include author name in the directory path")
    .option("--bug-report <bugReportId>", "Clone a bug report project")
    .action(
      async (
        packagePath: string | undefined,
        options: { includeAuthor?: boolean; bugReport?: string },
      ) => {
        const originalCwd = process.cwd()

        if (options.bugReport) {
          if (packagePath) {
            console.warn(
              "Package argument is ignored when --bug-report is provided.",
            )
          }
          await cloneBugReport({
            bugReportId: options.bugReport,
            originalCwd,
          })
          return
        }

        if (!packagePath) {
          console.error(
            "Package argument is required unless --bug-report is provided.",
          )
          process.exit(1)
        }

        const urlMatch = packagePath.match(
          /^https:\/\/tscircuit\.com\/([^/?#]+)\/([^/?#]+)\/?(?:\?([^#]*))?$/i,
        )
        const match =
          urlMatch ??
          packagePath.match(
            /^(?:@tsci\/)?([^/.@]+)[/.]([^/.@]+)(?:@([^/@\s]+))?$/,
          )
        if (!match) {
          console.error(
            "Invalid package path. Please use author/packageName or https://tscircuit.com/author/packageName.",
          )
          process.exit(1)
        }
        const [, author, packageName, suffix] = match
        const version = urlMatch
          ? new URLSearchParams(suffix).get("version")
          : suffix
        const fullName = `${author}/${packageName}`
        const releaseSpec = version ? `${fullName}@${version}` : fullName
        const releaseParams = version
          ? { package_name_with_version: releaseSpec }
          : { package_name: fullName, use_latest_version: true }
        console.log(`Cloning ${releaseSpec}...`)
        const userSettingToIncludeAuthor =
          options.includeAuthor || cliConfig.get("alwaysCloneWithAuthorName")
        const dirPath = userSettingToIncludeAuthor
          ? path.resolve(`${author}.${packageName}`)
          : path.resolve(packageName)

        // Check if directory already exists
        await handleExistingDirectory(dirPath)
        const ky = getRegistryApiKy()
        let packageFileList: { package_files: Array<{ file_path: string }> } = {
          package_files: [],
        }
        try {
          packageFileList = await ky
            .get<{ package_files: Array<{ file_path: string }> }>(
              "package_files/list",
              { searchParams: releaseParams },
            )
            .json()
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "response" in error &&
            typeof (error as any).response === "object" &&
            (error as any).response?.status === 404
          ) {
            console.error(
              `Package "${releaseSpec}" not found. Please check the name and try again.`,
            )
            process.exit(1)
          }
          console.error(
            "Failed to fetch package files:",
            error instanceof Error ? error.message : error,
          )
          process.exit(1)
        }

        fs.mkdirSync(dirPath, { recursive: true })

        for (const fileInfo of packageFileList.package_files) {
          const filePath = fileInfo.file_path.replace(/^\/+/, "")
          if (!filePath) continue

          const fullPath = path.join(dirPath, filePath)
          fs.mkdirSync(path.dirname(fullPath), { recursive: true })

          try {
            const fileContent = await ky
              .get<{
                package_file: {
                  package_file_id: string
                  is_text: boolean
                  content_text: string | null
                }
              }>("package_files/get", {
                searchParams: {
                  ...releaseParams,
                  file_path: fileInfo.file_path,
                },
              })
              .json()

            const { is_text: isText, content_text: contentText } =
              fileContent.package_file

            if (isText && typeof contentText === "string") {
              fs.writeFileSync(fullPath, contentText)
            } else if (!isText) {
              const fileBuffer = await ky
                .get("package_files/download", {
                  searchParams: {
                    package_file_id: fileContent.package_file.package_file_id,
                  },
                })
                .arrayBuffer()
              fs.writeFileSync(fullPath, Buffer.from(fileBuffer))
            } else {
              console.warn(`Skipping ${filePath} due to empty content.`)
            }
          } catch (error) {
            console.warn(
              `Skipping ${filePath} due to error:`,
              error instanceof Error ? error.message : error,
            )
          }
        }

        writeFileIfNotExists(
          path.join(dirPath, ".npmrc"),
          "@tsci:registry=https://npm.tscircuit.com",
        )

        generateTsConfig(dirPath)
        if (fs.existsSync(path.join(dirPath, "package.json"))) {
          const packageManager = getPackageManager(dirPath)
          const lockfiles = {
            bun: ["bun.lock", "bun.lockb"],
            npm: ["package-lock.json", "npm-shrinkwrap.json"],
            pnpm: ["pnpm-lock.yaml"],
            yarn: ["yarn.lock"],
          }
          const frozenLockfile = lockfiles[packageManager.name].some((file) =>
            fs.existsSync(path.join(dirPath, file)),
          )
          console.log("Installing dependencies...")
          try {
            packageManager.installAll({ cwd: dirPath, frozenLockfile })
            console.log("Dependencies installed successfully.")
          } catch (error) {
            console.warn("Failed to automatically install dependencies.")
            console.warn(error instanceof Error ? error.message : String(error))
            console.warn(
              `Please run \`${packageManager.getInstallAllCommand({ frozenLockfile })}\` manually.`,
            )
          }
        } else {
          await setupTsciProject(dirPath)
        }

        const relativeDirPath = path.relative(originalCwd, dirPath)

        console.log(kleur.green("\nSuccessfully cloned to:"))
        console.log(`  ${dirPath}/\n`)
        console.log(kleur.bold("Start developing:"))
        console.log(kleur.cyan(`  cd ${relativeDirPath}`))
        console.log(kleur.cyan("  tsci dev\n"))
      },
    )
}
