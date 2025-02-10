import type { Command } from "commander"
import { getKy } from "lib/registry-api/get-ky"
import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"

// Detect the package manager being used in the project
const detectPackageManager = (): string => {
  const userAgent = process.env.npm_config_user_agent || ""
  if (userAgent.startsWith("yarn")) return "yarn"
  if (userAgent.startsWith("pnpm")) return "pnpm"
  if (userAgent.startsWith("bun")) return "bun"

  if (fs.existsSync("yarn.lock")) return "yarn"
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm"
  if (fs.existsSync("bun.lockb")) return "bun"

  return "npm" // Default to npm
}

// Generate a React-compatible tsconfig.json
const generateTsConfig = (dir: string) => {
  const tsconfigPath = path.join(dir, "tsconfig.json")
  const tsconfigContent = JSON.stringify(
    {
      compilerOptions: {
        target: "ES6",
        module: "ESNext",
        jsx: "react-jsx",
        outDir: "dist",
        strict: true,
        esModuleInterop: true,
        moduleResolution: "node",
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        sourceMap: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
      },
    },
    null,
    2,
  )
  if (!fs.existsSync(tsconfigPath)) {
    fs.writeFileSync(tsconfigPath, tsconfigContent.trimStart())
    console.log(`Created: ${tsconfigPath}`)
  } else {
    console.log(`Skipped: ${tsconfigPath} already exists`)
  }
}

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

        const npmrcPath = path.join(dirPath, ".npmrc")
        fs.writeFileSync(npmrcPath, "@tsci:registry=https://npm.tscircuit.com")

        // Generate tsconfig.json
        generateTsConfig(dirPath)

        // Detect package manager and install dependencies
        const packageManager = detectPackageManager()
        console.log(`Detected package manager: ${packageManager}`)

        // Install deps using the detected package manager
        const dependencies = "@types/react @tscircuit/core"
        try {
          console.log("Installing dependencies...")
          const installCommand =
            packageManager === "yarn"
              ? `cd ${dirPath} && yarn add -D ${dependencies}`
              : packageManager === "pnpm"
                ? `cd ${dirPath} && pnpm add -D ${dependencies}`
                : packageManager === "bun"
                  ? `cd ${dirPath} && bun add -D ${dependencies}`
                  : `cd ${dirPath} && npm install -D ${dependencies}`
          execSync(installCommand, { stdio: "inherit" })
          console.log("Dependencies installed successfully.")
        } catch (error) {
          console.error("Failed to install dependencies:", error)
        }

        console.log(`Successfully cloned to ./${author}.${snippetName}/`)
        console.log(`Run "cd ${dirPath} && tsci dev" to start developing.`)
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
