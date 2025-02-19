import type { Command } from "commander"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"

export const registerClone = (program: Command) => {
  program
    .command("clone")
    .description("Clone a snippet from the registry")
    .argument("<snippet>", "Snippet to clone (e.g. author/snippetName)")
    .action(async (snippetPath: string) => {
      const match = snippetPath.match(/^(?:@tsci\/)?([^/.]+)[/.](.+)$/)
      if (!match) {
        console.error(
          "Invalid snippet path. Use format: author/snippetName, author.snippetName, or @tsci/author.snippetName",
        )
        process.exit(1)
      }

      const [, author, snippetName] = match
      console.log(`Cloning ${author}/${snippetName}...`)

      const ky = getKy()
      let packageFileList
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
        console.error(
          "Failed to fetch package files:",
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }

      const dirPath = path.resolve(`${author}.${snippetName}`)
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

      console.log(`Successfully cloned to ${dirPath}/`)
      console.log(
        `Run "cd ${path.dirname(dirPath)} && tsci dev" to start developing.`,
      )
    })
}
