import type { Command } from "commander"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"

export const registerClone = (program: Command) => {
  program
    .command("clone")
    .description("Clone a snippet from the registry")
    .argument("<snippet>", "Snippet to clone (e.g. author/snippetName)")
    .action(async (snippetPath: string) => {
      let author: string
      let snippetName: string
      if (!snippetPath.startsWith("@tsci/") && snippetPath.includes("/")) {
        ;[author, snippetName] = snippetPath.split("/")
      } else {
        const trimmedPath = snippetPath.replace("@tsci/", "")
        const firstDotIndex = trimmedPath.indexOf(".")
        author = trimmedPath.slice(0, firstDotIndex)
        snippetName = trimmedPath.slice(firstDotIndex + 1)
      }

      if (!author || !snippetName) {
        console.error(
          "Invalid snippet path. Use format: author/snippetName, author.snippetName or @tsci/author.snippetName",
        )
        process.exit(1)
      }

      const ky = getKy()

      try {
        console.log(`Cloning ${author}/${snippetName}...`)

        const packageFileList = await ky
          .post<{
            package_files: Array<{
              package_file_id: string
              package_release_id: string
              file_path: string
              created_at: string
            }>
          }>("package_files/list", {
            json: {
              package_name: `${author}/${snippetName}`,
              use_latest_version: true,
            },
          })
          .json()

        // Create directory if it doesn't exist
        const dirPath = `./${author}.${snippetName}`
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath)
        }

        // Download each file that doesn't start with dist/
        for (const fileInfo of packageFileList.package_files) {
          const filePath = fileInfo.file_path.startsWith("/")
            ? fileInfo.file_path.slice(1)
            : fileInfo.file_path

          if (filePath.startsWith("dist/")) continue

          const fileContent = await ky
            .post<{
              package_file: {
                content_text: string
              }
            }>("package_files/get", {
              json: {
                package_name: `${author}/${snippetName}`,
                file_path: fileInfo.file_path,
              },
            })
            .json()

          const fullPath = path.join(dirPath, filePath)
          const dirName = path.dirname(fullPath)

          // Create nested directories if they don't exist
          if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true })
          }

          fs.writeFileSync(fullPath, fileContent.package_file.content_text)
        }

        console.log(`Successfully cloned to ./${author}.${snippetName}/`)
      } catch (error) {
        if (error instanceof Error) {
          console.error("Failed to clone snippet:", error.message)
        } else {
          console.error("Failed to clone snippet:", error)
        }
        process.exit(1)
      }
    })
}
