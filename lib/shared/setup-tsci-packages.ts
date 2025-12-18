import fs from "node:fs"
import path from "node:path"
import { getPackageManager } from "./get-package-manager"
import { getDefaultTscircuitVersion } from "./get-default-tscircuit-version"

export async function setupTsciProject(
  directory = process.cwd(),
  devDependencies = [
    "@types/react",
    `tscircuit@${getDefaultTscircuitVersion()}`,
  ],
) {
  const projectPath = path.resolve(directory)
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true })
  }
  const packageManager = getPackageManager()

  console.log(`Initializing project in ${projectPath}...`)
  process.chdir(projectPath)

  if (!fs.existsSync("package.json")) {
    try {
      packageManager.init({ cwd: projectPath })
      console.log("Project initialized successfully.")
    } catch (error) {
      console.warn("Failed to automatically initialize project.")
      const initCommand = packageManager.getInitCommand()
      console.warn("Please initialize using the command:")
      console.warn(`  ${initCommand}`)
    }
  }

  // Read and modify package.json
  const packageJsonPath = path.join(projectPath, "package.json")
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  // Ensure required scripts exist
  packageJson.scripts = {
    ...(packageJson.scripts || {}),
    dev: "tsci dev",
    start: "tsci dev",
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  if (devDependencies.length > 0) {
    console.log("Installing dependencies...")
    try {
      packageManager.installDeps({
        deps: devDependencies,
        cwd: projectPath,
        dev: true,
      })
      console.log("Dependencies installed successfully.")
    } catch (error) {
      console.warn("Failed to automatically install the required dependencies.")
      const installCommand = packageManager.getInstallDepsCommand(
        devDependencies,
        true,
      )
      console.warn("Please install them manually using the command:")
      console.warn(`  ${installCommand}`)
    }
  }

  return packageJson.name || "unknown"
}
