import type { Command } from "commander"
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
  const tsconfigContent = `
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`
  if (!fs.existsSync(tsconfigPath)) {
    fs.writeFileSync(tsconfigPath, tsconfigContent.trimStart())
    console.log(`Created: ${tsconfigPath}`)
  } else {
    console.log(`Skipped: ${tsconfigPath} already exists`)
  }
}

export const registerInit = (program: Command) => {
  program
    .command("init")
    .description("Initialize a new TSCircuit project in the current directory")
    .action(() => {
      const currentDir = process.cwd()
      const indexFilePath = path.join(currentDir, "index.tsx")
      const npmrcFilePath = path.join(currentDir, ".npmrc")

      // Content for index.tsx
      const indexContent = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
);
`

      // Content for .npmrc
      const npmrcContent = `
@tsci:registry=https://npm.tscircuit.com
`

      // Create index.tsx if it doesn't exist
      if (!fs.existsSync(indexFilePath)) {
        fs.writeFileSync(indexFilePath, indexContent.trimStart())
        console.log(`Created: ${indexFilePath}`)
      } else {
        console.log(`Skipped: ${indexFilePath} already exists`)
      }

      // Create .npmrc if it doesn't exist
      if (!fs.existsSync(npmrcFilePath)) {
        fs.writeFileSync(npmrcFilePath, npmrcContent.trimStart())
        console.log(`Created: ${npmrcFilePath}`)
      } else {
        console.log(`Skipped: ${npmrcFilePath} already exists`)
      }

      // Detect the package manager
      const packageManager = detectPackageManager()
      console.log(`Detected package manager: ${packageManager}`)

      // Install @types/react using the detected package manager
      try {
        console.log("Installing dependencies...")
        const installCommand =
          packageManager === "yarn"
            ? "yarn add @types/react"
            : packageManager === "pnpm"
            ? "pnpm add @types/react"
            : packageManager === "bun"
            ? "bun add @types/react"
            : "npm install @types/react"
        execSync(installCommand, { stdio: "inherit" })
        console.log("@types/react installed successfully.")
      } catch (error) {
        console.error("Failed to install @types/react:", error)
      }

      // Generate tsconfig.json
      generateTsConfig(currentDir)

      console.log(
        `Initialization complete. Run "tsci dev" to start developing.`,
      )
    })
}