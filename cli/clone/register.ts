import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import kleur from "kleur"
import { cliConfig } from "lib/cli-config"

export const registerClone = (program: Command) => {
  program
    .command("clone")
    .description("Clone a package from the registry")
    .argument(
      "<package>",
      "Package to clone (e.g. author/packageName or https://tscircuit.com/author/packageName)",
    )
    .option("-a, --include-author", "Include author name in the directory path")
    .action(
      async (snippetPath: string, options: { includeAuthor?: boolean }) => {
        // First try to match URL format (strict tscircuit.com only)
        const urlMatch = snippetPath.match(
          /^https:\/\/tscircuit\.com\/([^\/]+)\/([^\/]+)\/?$/i,
        )
        // Then try the original format
        const originalMatch =
          !urlMatch && snippetPath.match(/^(?:@tsci\/)?([^/.]+)[/.]([^/.]+)$/)
        const originalCwd = process.cwd()

        if (!urlMatch && !originalMatch) {
          console.error(
            `Invalid package path "${snippetPath}". Accepted formats:\n - author/snippetName\n - author.snippetName \n - @tsci/author.snippetName\n - https://tscircuit.com/author/snippetName`,
          )
          process.exit(1)
        }

        const match = urlMatch || originalMatch
        if (!match) throw new Error("No valid match found") // Should never happen due to earlier check
        const [, author, snippetName] = match
        console.log(`Cloning ${author}/${snippetName}...`)

        const ky = getRegistryApiKy()
        let packageFileList: { package_files: Array<{ file_path: string }> } = {
          package_files: [],
        }
        try {
          packageFileList = await ky
            .post<{ package_files: Array<{ file_path: string }> }>(
              "package_files/list",
              {
                json: {
                  package_name: `${author}/${snippetName}`,
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
              `Snippet "${author}/${snippetName}" not found. Please check the name and try again.`,
            )
            process.exit(1)
          }
          console.error(
            "Failed to fetch package files:",
            error instanceof Error ? error.message : error,
          )
          process.exit(1)
        }
        const userSettingToIncludeAuthor =
          options.includeAuthor || cliConfig.get("alwaysCloneWithAuthorName")
        const dirPath = userSettingToIncludeAuthor
          ? path.resolve(`${author}.${snippetName}`)
          : path.resolve(snippetName)
        fs.mkdirSync(dirPath, { recursive: true })

        for (const fileInfo of packageFileList.package_files) {
          const filePath = fileInfo.file_path.replace(/^\/|dist\//g, "")
          if (!filePath) continue

          const fullPath = path.join(dirPath, filePath)
          fs.mkdirSync(path.dirname(fullPath), { recursive: true })

          try {
            const fileContent = await ky
              .post<{ package_file: { content_text: string } }>(
                "package_files/get",
                {
                  json: {
                    package_name: `${author}/${snippetName}`,
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

        fs.writeFileSync(
          path.join(dirPath, ".npmrc"),
          "@tsci:registry=https://npm.tscircuit.com",
        )

        generateTsConfig(dirPath)
        setupTsciProject(dirPath)

        const relativeDirPath = path.relative(originalCwd, dirPath)

        console.log(kleur.green("\nSuccessfully cloned to:"))
        console.log(`  ${dirPath}/\n`)
        console.log(kleur.bold("Start developing:"))
        console.log(kleur.cyan(`  cd ${relativeDirPath}`))
        console.log(kleur.cyan("  tsci dev\n"))
      },
    )
}
