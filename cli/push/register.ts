import type { Command } from "commander"
import { cliConfig } from "lib/cli-config"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"

export const registerPush = (program: Command) => {
  program
    .command("push")
    .description("Save snippet code to Registry API")
    .argument("[file]", "Path to the snippet file")
    .action(async (file?: string) => {
      const token = cliConfig.get("sessionToken")
      if (!token) {
        console.error("You need to log in to save snippet.")
        process.exit(1)
      }

      let snippetFileAbsolutePath: string | null = null

      if (file) {
        snippetFileAbsolutePath = path.resolve(file)
      } else {
        const entrypointPath = path.resolve("index.tsx")
        if (fs.existsSync(entrypointPath)) {
          snippetFileAbsolutePath = entrypointPath
          console.log("No file provided. Using 'index.tsx' as the entrypoint.")
        } else {
          console.error(
            "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
          )
          process.exit(1)
        }
      }

      if (!fs.existsSync(snippetFileAbsolutePath)) {
        console.error(`File not found: ${snippetFileAbsolutePath}`)
        process.exit(1)
      }

      const ky = getKy()
      const response = await ky
        .post<{ snippet: { snippet_id: string; name: string } }>(
          "snippets/create",
          {
            json: {
              code: fs.readFileSync(snippetFileAbsolutePath).toString(),
              snippet_type: "package",
              circuit_json: null,
            },
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        .json()
        .catch((error) => {
          console.error(`Error saving snippet: ${error}`)
          process.exit(1)
        })

      console.log(
        `Successfully saved code. Available at: https://tscircuit.com/${response.snippet.name}`,
      )
    })
}
