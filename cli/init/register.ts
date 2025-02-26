import * as fs from "node:fs"
import * as path from "node:path"
import { Command } from "commander"
import { execSync } from "child_process"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { writeFileIfNotExists } from "lib/shared/write-file-if-not-exists"
import { generateGitIgnoreFile } from "lib/shared/generate-gitignore-file"
import { generatePackageJson } from "lib/shared/generate-package-json"
import { version as currentVersion } from "package.json"
import { detectPackageManager } from "lib/shared/detect-pkg-manager"

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
      // Check for the latest version using fetch
      try {
        const response = await fetch(
          "https://registry.npmjs.org/@tscircuit/cli",
        )
        if (!response.ok) return

        const data = await response.json()
        const latestVersion = data["dist-tags"].latest

        if (latestVersion !== currentVersion) {
          const packageManager = detectPackageManager()
          const installCommand = `${packageManager} add -g @tscircuit/cli`
          console.warn(
            `⚠ A new version of tsci is available (${currentVersion} → ${latestVersion}). Update? (Y/n)`,
          )
          process.stdin.setEncoding("utf8")
          process.stdin.resume()
          process.stdin.once("data", (input: string) => {
            const answer = input.trim().toLowerCase()
            if (answer === "y" || answer === "") {
              console.log(`Running: ${installCommand}`)
              try {
                execSync(installCommand, { stdio: "inherit" })
                console.log("✅ Update successful!")
              } catch (err) {
                console.log(
                  "❌ Update failed. Please try manually or use root permission",
                )
              }
            }
            process.stdin.pause()
          })
        }
      } catch (error) {
        //skipping the error don't show any message for better developer experience
      }

      //  Initialize the project
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
        `\u2728 Initialization complete! Run ${
          directory ? `"cd ${directory}" & ` : ""
        }"tsci dev" to start developing.`,
      )
      process.exit(0)
    })
}

const getGlobalInstallCommand = (
  packageManager: string,
  packageName: string,
): string => {
  switch (packageManager) {
    case "yarn":
      return `yarn global add ${packageName}`
    case "pnpm":
      return `pnpm add -g ${packageName}`
    case "bun":
      return `bun add -g ${packageName}`
    default:
      return `npm install -g ${packageName}`
  }
}
