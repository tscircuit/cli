import { execSync } from "node:child_process"

/**
 * Install a package using bun add
 */
export function installPackage(packageSpec: string, projectRoot: string): void {
  try {
    execSync(`bun add ${packageSpec}`, {
      cwd: projectRoot,
      stdio: "inherit",
    })
  } catch (error) {
    throw new Error(`Failed to install ${packageSpec}`)
  }
}
