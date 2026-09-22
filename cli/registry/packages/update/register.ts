import fs from "node:fs"
import path from "node:path"
import type { Command } from "commander"
import kleur from "kleur"
import { getRegistryApiKy } from "lib/registry-api/get-ky"

interface RegistryPackagesUpdateOptions {
  packageName?: string
  enablePublicDist?: boolean
  disablePublicDist?: boolean
  githubRepo?: string
  unlinkGithub?: boolean
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
    .option(
      "--github-repo <owner/repo>",
      "Link a GitHub repository, as in package settings",
    )
    .option("--unlink-github", "Remove the linked GitHub repository")
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

      if (opts.githubRepo !== undefined && opts.unlinkGithub) {
        console.error("Cannot use both --github-repo and --unlink-github")
        process.exit(1)
      }

      if (
        opts.githubRepo !== undefined &&
        !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9_.-]{1,100}$/.test(
          opts.githubRepo,
        )
      ) {
        console.error(
          "GitHub repository must be in owner/repo format (for example, tscircuit/my-board)",
        )
        process.exit(1)
      }

      const publicDistEnabled = getPublicDistEnabledFromOptions({
        enablePublicDist: opts.enablePublicDist,
        disablePublicDist: opts.disablePublicDist,
      })

      if (
        publicDistEnabled === undefined &&
        opts.githubRepo === undefined &&
        !opts.unlinkGithub
      ) {
        console.error(
          "You must provide --enable-public-dist, --disable-public-dist, --github-repo, or --unlink-github",
        )
        process.exit(1)
      }

      try {
        const ky = getRegistryApiKy()
        // package.json uses @tsci/owner.package; the registry lookup uses owner/package.
        const registryName = packageName.startsWith("@tsci/")
          ? packageName.slice(6).replace(".", "/")
          : packageName.replace(/^@/, "")
        const { package: pkg } = await ky
          .post("packages/get", {
            json: { name: registryName },
          })
          .json<{ package: { package_id: string } }>()
        await ky.post("packages/update", {
          json: {
            package_id: pkg.package_id,
            ...(publicDistEnabled !== undefined
              ? { public_dist_enabled: publicDistEnabled }
              : {}),
            ...(opts.githubRepo !== undefined
              ? { github_repo_full_name: opts.githubRepo }
              : {}),
            ...(opts.unlinkGithub ? { github_repo_full_name: null } : {}),
          },
        })
        console.log(kleur.green(`Updated package ${packageName}`))
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
