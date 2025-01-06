import type { Command } from "commander"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"

export const registerClone = (program: Command) => {
  program
    .command("clone")
    .description("Clone a snippet from the registry")
    .argument("<snippet>", "Snippet to clone (format: author/snippetName)")
    .action(async (snippetPath: string) => {
      const [author, snippetName] = snippetPath.split("/")

      if (!author || !snippetName) {
        console.error("Invalid snippet path. Use format: author/snippetName")
        process.exit(1)
      }

      const ky = getKy()

      try {
        console.log(`Cloning ${author}/${snippetName}...`)

        const response = await ky
          .get(`snippets/${author}/${snippetName}`)
          .json()

        // Create directory if it doesn't exist
        const dirPath = `./${snippetName}`
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath)
        }

        // Write the snippet file
        fs.writeFileSync(
          path.join(dirPath, "snippet.tsx"),
          response.snippet.content,
        )

        console.log(`Successfully cloned to ./${snippetName}/`)
      } catch (error) {
        console.error("Failed to clone snippet:", error.message)
        process.exit(1)
      }
    })
}
