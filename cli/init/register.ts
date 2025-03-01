import { SilkscreenCircleProps } from "./../../node_modules/@tscircuit/props/lib/components/silkscreen-circle"
import type { Command } from "commander"
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { writeFileIfNotExists } from "lib/shared/write-file-if-not-exists"
import { generateGitIgnoreFile } from "lib/shared/generate-gitignore-file"
import { generatePackageJson } from "lib/shared/generate-package-json"
import { detectPackageManager } from "lib/shared/detect-pkg-manager"

const checkForUpdates = async () => {
  try {
    if (process.env.NODE_ENV === "test") {
      console.info("Skipping update check")
      return
    }

    const response = await fetch(
      "https://registry.npmjs.org/@tscircuit/cli/latest",
    )
    if (!response.ok) {
      throw new Error("Network response was not ok")
    }
    const latestVersion = (await response.json()).version
    const currentVersion = execSync("tsci --version").toString().trim()

    if (latestVersion !== currentVersion) {
      console.info(
        `A new version of tsci is available: ${latestVersion} (current: ${currentVersion})`,
      )
      const userResponse = await new Promise<string>((resolve) => {
        process.stdin.resume()
        process.stdout.write("Would you like to update now? (Y/n): ")
        process.stdin.once("data", (data) => resolve(data.toString().trim()))
      })

      if (userResponse.toLowerCase() === "y" || userResponse === "") {
        const packageManager = detectPackageManager()
        let updateCommand = ""

        switch (packageManager) {
          case "yarn":
            updateCommand = "yarn global add @tscircuit/cli"
            break
          case "pnpm":
            updateCommand = "pnpm add -g @tscircuit/cli"
            break
          case "bun":
            updateCommand = "bun add -g @tscircuit/cli"
            break
          default:
            updateCommand = "npm install -g @tscircuit/cli"
        }

        console.info(`Updating tsci using ${packageManager}...`)
        console.info(`Running command: ${updateCommand}`)
        execSync(updateCommand, { stdio: "inherit" })
        console.info("Update complete. Please re-run your command.")
        process.exit(0)
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to check for updates:", error.message)
    } else {
      console.error("Failed to check for updates:", error)
    }
  }
}

export const registerInit = (program: Command) => {
  program
    .command("init")
    .description(
      "Initialize a new TSCircuit project in the specified directory (or current directory if none is provided)",
    )
    .argument(
      "[directory]",
      "Directory name (optional, defaults to current directory)",
    )
    .action(async (directory?: string) => {
      await checkForUpdates()

      const projectDir = directory
        ? path.resolve(process.cwd(), directory)
        : process.cwd()

      // Ensure the directory exists
      fs.mkdirSync(projectDir, { recursive: true })

      // Create essential project files
      writeFileIfNotExists(
        path.join(projectDir, "index.tsx"),
        `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={-3} pcbX={-3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
);
`,
      )

      writeFileIfNotExists(
        path.join(projectDir, ".npmrc"),
        `
@tsci:registry=https://npm.tscircuit.com
`,
      )

      // Generate package.json
      generatePackageJson(projectDir)
      // Generate tsconfig.json
      generateTsConfig(projectDir)
      // Create .gitignore file
      generateGitIgnoreFile(projectDir)
      // Setup project dependencies
      setupTsciProject(projectDir)

      console.info(
        `🎉 Initialization complete! Run ${directory ? `"cd ${directory}" & ` : ""}"tsci dev" to start developing.`,
      )

      process.exit(0)
    })
}
