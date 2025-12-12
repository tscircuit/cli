import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { generateNpmrcContent } from "lib/shared/generate-npmrc-content"
import kleur from "kleur"
import { cliConfig } from "lib/cli-config"
import { cloneBugReport } from "./clone-bug-report"
import { handleExistingDirectory } from "./handle-existing-directory"

export const registerClone = (program: Command) => {
  program
    .command("clone")
    .description("Clone a package from the registry")
    .argument(
      "[package]",
      "Package to clone (e.g. author/packageName or https://tscircuit.com/author/packageName)",
    )
    .option("-a, --include-author", "Include author name in the directory path")
    .option("--bug-report <bugReportId>", "Clone a bug report project")
    .action(
      async (
        packagePath: string | undefined,
        options: { includeAuthor?: boolean; bugReport?: string },
      ) => {
        // First try to match URL format (strict tscircuit.com only)
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
          /^https:\/\/tscircuit\.com\/([^\/]+)\/([^\/]+)\/?$/i,
        )
        // Then try the original format
        const originalMatch =
          !urlMatch && packagePath.match(/^(?:@tsci\/)?([^/.]+)[/.]([^/.]+)$/)

        const match = urlMatch || originalMatch
        if (!match) {
          console.error(
            "Invalid package path. Please use author/packageName or https://tscircuit.com/author/packageName.",
          )
          process.exit(1)
        }
        const [, author, packageName] = match
        console.log(`Cloning ${author}/${packageName}...`)
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
              {
                searchParams: {
                  package_name: `${author}/${packageName}`,
                  use_latest_version: true,
                },
              },
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
              `Package "${author}/${packageName}" not found. Please check the name and try again.`,
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
          const filePath = fileInfo.file_path.replace(/^\/|dist\//g, "")
          if (!filePath) continue

          const fullPath = path.join(dirPath, filePath)
          fs.mkdirSync(path.dirname(fullPath), { recursive: true })

          try {
            const fileContent = await ky
              .get<{ package_file: { content_text: string } }>(
                "package_files/get",
                {
                  searchParams: {
                    package_name: `${author}/${packageName}`,
                    use_latest_version: true,
                    file_path: fileInfo.file_path,
                  },
                },
              )
              .json()

            fs.writeFileSync(fullPath, fileContent.package_file.content_text)
          } catch (error) {
            console.warn(
              `Skipping ${filePath} due to error:`,
              error instanceof Error ? error.message : error,
            )
          }
        }

        fs.writeFileSync(path.join(dirPath, ".npmrc"), generateNpmrcContent())

        generateTsConfig(dirPath)
        await setupTsciProject(dirPath)

        const relativeDirPath = path.relative(originalCwd, dirPath)

        console.log(kleur.green("\nSuccessfully cloned to:"))
        console.log(`  ${dirPath}/\n`)
        console.log(kleur.bold("Start developing:"))
        console.log(kleur.cyan(`  cd ${relativeDirPath}`))
        console.log(kleur.cyan("  tsci dev\n"))
      },
    )
}
