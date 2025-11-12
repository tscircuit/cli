import fs from "node:fs"
import path from "node:path"
import kleur from "kleur"
import { generatePackageJson } from "./generate-package-json"
import { getPackageManager } from "./get-package-manager"
import { collectTsciDependencies } from "./collect-tsci-dependencies"

export interface InstallProjectDependenciesOptions {
  cwd?: string
}

export async function installProjectDependencies({
  cwd = process.cwd(),
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

  // Create .npmrc if it doesn't exist
  if (!fs.existsSync(npmrcPath)) {
    console.log("Creating .npmrc with tscircuit registry configuration.")
    fs.writeFileSync(npmrcPath, "@tsci:registry=https://npm.tscircuit.com")
  }

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8"),
  ) as Record<string, any>

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
    throw error
  }
}
