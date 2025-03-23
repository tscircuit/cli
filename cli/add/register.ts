import type { Command } from "commander"
import { detectPackageManager } from "lib/shared/detect-pkg-manager"
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { getKy } from "lib/registry-api/get-ky"

interface PackageJson {
  dependencies: Record<string, string>
}

export const registerAdd = (program: Command) => {
  program
    .command("add")
    .description("Add a component from tscircuit.com")
    .argument(
      "<component>",
      "Component to add (e.g. @tsci/author.component-name)",
    )
    .action(async (componentPath: string) => {
      const workingDir = process.cwd()

      // Ensure the package name is in the correct format
      if (!componentPath.startsWith("@tsci/")) {
        process.stderr.write(
          "Invalid component path. Package name must start with @tsci/\n",
        )
        process.exit(1)
      }

      // Ensure .npmrc exists with the correct registry
      const npmrcPath = path.join(workingDir, ".npmrc")
      if (!fs.existsSync(npmrcPath)) {
        fs.writeFileSync(
          npmrcPath,
          "@tsci:registry=https://npm.tscircuit.com\n",
        )
      }

      // Check if package exists in registry
      const ky = getKy()
      try {
        await ky
          .get("packages/get", {
            searchParams: { name: componentPath },
          })
          .json()
      } catch (error) {
        process.stderr.write(`Package ${componentPath} not found in registry\n`)
        process.exit(1)
      }

      // Read and update package.json
      const packageJsonPath = path.join(workingDir, "package.json")
      let packageJson: PackageJson = { dependencies: {} }
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
      }

      // Add the package to dependencies
      packageJson.dependencies[componentPath] = "latest"
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

      // Skip actual installation in test environment
      if (process.env.NODE_ENV !== "test") {
        // Install the package using the detected package manager
        const packageManager = detectPackageManager()
        const installCommand =
          packageManager === "yarn"
            ? `yarn add ${componentPath}`
            : packageManager === "pnpm"
              ? `pnpm add ${componentPath}`
              : packageManager === "bun"
                ? `bun add ${componentPath}`
                : `npm install ${componentPath}`

        try {
          // Execute with a timeout and capture output
          execSync(installCommand, {
            stdio: "pipe",
            timeout: 5000,
            encoding: "utf8",
            cwd: workingDir,
          })
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ETIMEDOUT"
          ) {
            process.stderr.write("Command timed out\n")
          } else {
            process.stderr.write(
              `Failed to install component: ${error instanceof Error ? error.message : error}\n`,
            )
          }
          process.exit(1)
        }
      }

      process.stdout.write(`Added ${componentPath}\n`)
    })
}
