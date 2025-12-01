import type { Command } from "commander"
import * as fs from "node:fs"
import * as path from "node:path"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { writeFileIfNotExists } from "lib/shared/write-file-if-not-exists"
import { generateGitIgnoreFile } from "lib/shared/generate-gitignore-file"
import { generatePackageJson } from "lib/shared/generate-package-json"
import { cliConfig, getSessionToken } from "lib/cli-config"
import { jwtDecode } from "jwt-decode"
import { loadProjectConfig, saveProjectConfig } from "lib/project-config"
import { checkForTsciUpdates } from "lib/shared/check-for-cli-update"
import { prompts } from "lib/utils/prompts"

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
    .option("-y, --yes", "Use defaults and skip prompts")
    .option("--no-install", "Skip installing dependencies")
    .action(async (directory?: string, options?: { yes?: boolean; install?: boolean }) => {
      await checkForTsciUpdates()

      if (!directory && !options?.yes) {
        const { continueInCurrentDirectory } = await prompts({
          type: "confirm",
          name: "continueInCurrentDirectory",
          message:
            "Do you want to initialize a new project in the current directory?",
        })
        if (!continueInCurrentDirectory) {
          const { desiredDirectory } = await prompts({
            type: "text",
            name: "desiredDirectory",
            message: "Enter the desired directory name",
          })
          if (desiredDirectory) {
            directory = desiredDirectory
          } else {
            console.log("Project initialization cancelled.")
            return process.exit(0)
          }
        }
      }

      const projectDir = directory
        ? path.resolve(process.cwd(), directory)
        : process.cwd()

      const defaultPackageName = path.basename(projectDir)
      const { packageName } = options?.yes
        ? { packageName: defaultPackageName }
        : await prompts({
            type: "text",
            name: "packageName",
            message: "Package name",
            initial: defaultPackageName,
          })

      let authorName = cliConfig.get("githubUsername")
      if (!authorName) {
        const token = getSessionToken()
        if (token) {
          try {
            const decoded = jwtDecode<{
              github_username?: string
            }>(token)
            if (decoded.github_username) {
              authorName = decoded.github_username
            }
          } catch {}
        }
      }

      // Ensure the directory exists
      fs.mkdirSync(projectDir, { recursive: true })

      // Create essential project files
      writeFileIfNotExists(
        path.join(projectDir, "index.tsx"),
        `
export default () => (
  <board>
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={-3} pcbX={-3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`,
      )

      const projectConfig = loadProjectConfig(projectDir) ?? {}
      projectConfig.mainEntrypoint = "index.tsx"
      if (saveProjectConfig(projectConfig, projectDir)) {
        console.log(
          "Updated tscircuit.config.json with mainEntrypoint: 'index.tsx'",
        )
      }

      writeFileIfNotExists(
        path.join(projectDir, ".npmrc"),
        `
@tsci:registry=https://npm.tscircuit.com
`,
      )

      console.log("Generating package.json")
      // Generate package.json
      generatePackageJson(projectDir, { packageName, authorName })
      // Generate tsconfig.json
      generateTsConfig(projectDir)
      // Create .gitignore file
      generateGitIgnoreFile(projectDir)
      // Setup project dependencies
      setupTsciProject(projectDir, options?.install ? undefined : [])

      console.info(
        `🎉 Initialization complete! Run ${directory ? `"cd ${directory}" & ` : ""}"tsci dev" to start developing.`,
      )
      process.exit(0)
    })
}
