import { execSync } from "node:child_process"

/**
 * Install a GitHub repository using bun add
 */
export function installPackage(githubUrl: string, projectRoot: string): void {
  try {
    execSync(`bun add ${githubUrl}`, {
      cwd: projectRoot,
      stdio: "inherit",
    })
  } catch (error) {
    throw new Error(`Failed to install ${githubUrl}`)
  }
}
