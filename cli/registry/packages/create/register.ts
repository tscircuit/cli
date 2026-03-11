import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"

interface RegistryPackagesCreateOptions {
  packageName: string
  org?: string
  unlisted?: boolean
  private?: boolean
  public?: boolean
}

export const getRegistryPackageName = ({
  packageName,
  org,
}: {
  packageName: string
  org?: string
}) => {
  if (!org) return packageName
  return `@tsci/${org}.${packageName}`
}

export const getIsPrivateFromOptions = ({
  isPrivate,
  isPublic,
}: {
  isPrivate?: boolean
  isPublic?: boolean
}) => {
  if (isPublic) return false
  if (isPrivate) return true
  return true
}

export const registerRegistryPackagesCreate = (program: Command) => {
  program.commands
    .find((command) => command.name() === "registry")!
    .commands.find((command) => command.name() === "packages")!
    .command("create")
    .description("Create a package in the tscircuit registry")
    .requiredOption("--package-name <packageName>", "Package name to create")
    .option("--org <org>", "Organization name")
    .option("--unlisted", "Create package as unlisted")
    .option("--private", "Create package as private")
    .option("--public", "Create package as public")
    .action(async (opts: RegistryPackagesCreateOptions) => {
      if (opts.private && opts.public) {
        console.error("Cannot use both --private and --public")
        process.exit(1)
      }

      const packageName = getRegistryPackageName({
        packageName: opts.packageName,
        org: opts.org,
      })

      const isPrivate = getIsPrivateFromOptions({
        isPrivate: opts.private,
        isPublic: opts.public,
      })

      try {
        const ky = getRegistryApiKy()
        await ky.post("packages/create", {
          json: {
            name: packageName,
            ...(opts.unlisted ? { is_unlisted: true } : {}),
            is_private: isPrivate,
          },
        })
        console.log(kleur.green(`Created package ${packageName}`))
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
