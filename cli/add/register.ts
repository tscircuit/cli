import { Command } from "commander"
import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"
import { detectPackageManager } from "lib/shared/detect-pkg-manager"
import { checkForTsciUpdates } from "lib/shared/check-for-cli-update"

export const registerAdd = (program: Command) => {
  program
    .command("add")
    .description("Add a component from tscircuit.com")
    .argument("<component>", "Component to add (e.g. author/component-name)")
    .action(async (componentPath: string) => {
      await checkForTsciUpdates()

      let packageName: string

      // Handle different input formats
      if (componentPath.startsWith("@tscircuit/")) {
        // Direct npm package with @tscircuit scope
        packageName = componentPath
      } else if (componentPath.startsWith("@tsci/")) {
        // Direct tscircuit registry package
        packageName = componentPath
      } else {
        // Parse author/component format
        const match = componentPath.match(/^([^/.]+)[/.](.+)$/)
        if (!match) {
          console.error(
            "Invalid component path. Use format: author/component-name, author.component-name, @tscircuit/package-name, or @tsci/author.component-name"
          )
          process.exit(1)
        }

        const [, author, componentName] = match
        packageName = `@tsci/${author}.${componentName}`
      }

      console.log(`Adding ${packageName}...`)

      // Ensure .npmrc exists with the correct registry
      const npmrcPath = path.join(process.cwd(), ".npmrc")
      const npmrcContent = fs.existsSync(npmrcPath)
        ? fs.readFileSync(npmrcPath, "utf-8")
        : ""

      if (!npmrcContent.includes("@tsci:registry=https://npm.tscircuit.com")) {
        fs.writeFileSync(
          npmrcPath,
          `${npmrcContent}\n@tsci:registry=https://npm.tscircuit.com\n`
        )
        console.log("Updated .npmrc with tscircuit registry")
      }

      // Install the package using the detected package manager
      const packageManager = detectPackageManager()
      const installCommand =
        packageManager === "yarn"
          ? `yarn add ${packageName}`
          : packageManager === "pnpm"
          ? `pnpm add ${packageName}`
          : packageManager === "bun"
          ? `bun add ${packageName}`
          : `npm install ${packageName}`

      try {
        execSync(installCommand, { stdio: "inherit" })
        console.log(`Added ${packageName} successfully.`)
      } catch (error) {
        console.error(
          `Failed to add ${packageName}:`,
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })
}
