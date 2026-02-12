import fs from "node:fs"
import path from "node:path"
import kleur from "kleur"
import { generatePackageJson } from "./generate-package-json"
import { generateTsConfig } from "./generate-ts-config"
import { getPackageManager } from "./get-package-manager"
import { collectTsciDependencies } from "./collect-tsci-dependencies"
import { handleRegistryAuthError } from "./handle-registry-auth-error"

export interface InstallProjectDependenciesOptions {
  cwd?: string
  skipTscircuitPackage?: boolean
}

export async function installProjectDependencies({
  cwd = process.cwd(),
  skipTscircuitPackage = false,
}: InstallProjectDependenciesOptions = {}) {
  const projectRoot = path.resolve(cwd)
  const packageJsonPath = path.join(projectRoot, "package.json")
  const npmrcPath = path.join(projectRoot, ".npmrc")
  const packageManager = getPackageManager()

  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Directory not found: ${projectRoot}`)
  }

  let packageJsonCreated = false

  if (!fs.existsSync(packageJsonPath)) {
    console.log("No package.json found. Generating a new one.")
    generatePackageJson(projectRoot)
    packageJsonCreated = true
  } else {
    console.log("Found existing package.json.")
  }

  // Generate tsconfig.json if it doesn't exist (uses writeFileIfNotExists internally)
  const tsconfigPath = path.join(projectRoot, "tsconfig.json")
  if (!fs.existsSync(tsconfigPath)) {
    console.log("No tsconfig.json found. Generating a new one.")
    generateTsConfig(projectRoot)
  }

  // Create .npmrc if it doesn't exist
  if (!fs.existsSync(npmrcPath)) {
    console.log("Creating .npmrc with tscircuit registry configuration.")
    fs.writeFileSync(npmrcPath, "@tsci:registry=https://npm.tscircuit.com")
  }

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8"),
  ) as Record<string, any>

  // Remove tscircuit packages if skipTscircuitPackage is true
  // This allows the cloud container's pre-installed version to be used
  if (skipTscircuitPackage) {
    const isTscircuitPackage = (name: string) => name === "tscircuit"

    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        if (isTscircuitPackage(dep)) {
          delete packageJson.dependencies[dep]
        }
      }
    }
    if (packageJson.devDependencies) {
      for (const dep of Object.keys(packageJson.devDependencies)) {
        if (isTscircuitPackage(dep)) {
          delete packageJson.devDependencies[dep]
        }
      }
    }
    console.log(
      "Skipping tscircuit package installation (using cloud container version).",
    )
  }

  if (packageJsonCreated) {
    const tsciDependencies = collectTsciDependencies({ cwd: projectRoot })
    if (tsciDependencies.length > 0) {
      packageJson.dependencies = packageJson.dependencies || {}
      for (const dependency of tsciDependencies) {
        if (!packageJson.dependencies[dependency]) {
          packageJson.dependencies[dependency] = "latest"
        }
      }
      console.log(
        `Added ${tsciDependencies.length} @tsci dependencies to package.json.`,
      )
    } else {
      console.log("No @tsci dependencies detected in circuit files.")
    }
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

  console.log(
    `Installing dependencies using ${kleur.bold(packageManager.name)}...`,
  )

  try {
    packageManager.installAll({ cwd: projectRoot })
    console.log("Dependencies installed successfully.")
  } catch (error) {
    console.warn("Failed to automatically install dependencies.")
    console.warn(
      `Please run \`${packageManager.getInstallAllCommand()}\` manually.`,
    )
    handleRegistryAuthError({ error, projectDir: projectRoot })
    throw error
  }
}
