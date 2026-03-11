import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"

interface RegistryPackagesUpdateOptions {
  packageName: string
  enablePublicDist?: boolean
  disablePublicDist?: boolean
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
    .requiredOption("--package-name <packageName>", "Package name to update")
    .option("--enable-public-dist", "Enable public dist")
    .option("--disable-public-dist", "Disable public dist")
    .action(async (opts: RegistryPackagesUpdateOptions) => {
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
            package_name: opts.packageName,
            public_dist_enabled: publicDistEnabled,
          },
        })
        console.log(kleur.green(`Updated package ${opts.packageName}`))
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
