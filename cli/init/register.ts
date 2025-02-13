import type { Command } from "commander"
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { setupTsciProject } from "lib/shared/setup-tsci-packages"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { writeFileIfNotExists } from "lib/shared/write-file-if-not-exists"
import { generateGitIgnoreFile } from "lib/shared/generate-gitignore-file"

const generatePackageJson = (dir: string) => {
  const packageJsonPath = path.join(dir, "package.json")
  const packageJsonContent = {
    name: path.basename(dir),
    version: "0.1.0",
    description: "A TSCircuit project",
    main: "index.tsx",
    scripts: {
      dev: "tsci dev",
      build: "tsci build",
    },
    keywords: ["tscircuit", "electronics"],
  }
  if (!fs.existsSync(packageJsonPath)) {
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJsonContent, null, 2),
    )
    console.log(`Created: ${packageJsonPath}`)
  } else {
    console.log(`Skipped: ${packageJsonPath} already exists`)
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
    .action((directory?: string) => {
      const projectDir = directory
        ? path.resolve(process.cwd(), directory)
        : process.cwd()

      // Ensure the directory exists
      fs.mkdirSync(projectDir, { recursive: true })

      // Create essential project files
      writeFileIfNotExists(
        path.join(projectDir, "index.tsx"),
        `
import "@tscircuit/core";

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

      // Setup project dependencies
      try {
        setupTsciProject(projectDir)
      } catch (error) {
        console.error("Failed to install dependencies:", error)
        process.exit(1)
      }

      // Generate tsconfig.json
      generateTsConfig(projectDir)
      // Create .gitignore file
      generateGitIgnoreFile(projectDir)

      console.info(
        `🎉 Initialization complete! Run ${directory ? `"cd ${directory}" & ` : ""}"tsci dev" to start developing.`,
      )
      process.exit(0)
    })
}
