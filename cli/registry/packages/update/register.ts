import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"
import fs from "node:fs"
import path from "node:path"

interface RegistryPackagesUpdateOptions {
  packageName?: string
  enablePublicDist?: boolean
  disablePublicDist?: boolean
}

export const getCurrentDirectoryPackageName = (): string | undefined => {
  const packageJsonPath = path.join(process.cwd(), "package.json")

  if (!fs.existsSync(packageJsonPath)) return undefined

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
    return typeof packageJson.name === "string" ? packageJson.name : undefined
  } catch {
    return undefined
  }
}

export const getPublicDistEnabledFromOptions = ({
  enablePublicDist,
  disablePublicDist,
}: {
  enablePublicDist?: boolean
  disablePublicDist?: boolean
}) => {
  if (enablePublicDist) return true
  if (disablePublicDist) return false
  return undefined
}

export const registerRegistryPackagesUpdate = (program: Command) => {
  program.commands
    .find((command) => command.name() === "registry")!
    .commands.find((command) => command.name() === "packages")!
    .command("update")
    .description("Update a package in the tscircuit registry")
    .option("--package-name <packageName>", "Package name to update")
    .option("--enable-public-dist", "Enable public dist")
    .option("--disable-public-dist", "Disable public dist")
    .action(async (opts: RegistryPackagesUpdateOptions) => {
      const packageName = opts.packageName ?? getCurrentDirectoryPackageName()

      if (!opts.packageName && packageName) {
        console.warn(
          "No package specified, using package in current directory...",
        )
      }

      if (!packageName) {
        console.error(
          "No package specified and no package name found in current directory package.json",
        )
        process.exit(1)
      }

      if (opts.enablePublicDist && opts.disablePublicDist) {
        console.error(
          "Cannot use both --enable-public-dist and --disable-public-dist",
        )
        process.exit(1)
      }

      const publicDistEnabled = getPublicDistEnabledFromOptions({
        enablePublicDist: opts.enablePublicDist,
        disablePublicDist: opts.disablePublicDist,
      })

      if (publicDistEnabled === undefined) {
        console.error(
          "You must provide either --enable-public-dist or --disable-public-dist",
        )
        process.exit(1)
      }

      try {
        const ky = getRegistryApiKy()
        await ky.post("packages/update", {
          json: {
            package_name: packageName,
            public_dist_enabled: publicDistEnabled,
          },
        })
        console.log(kleur.green(`Updated package ${packageName}`))
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
