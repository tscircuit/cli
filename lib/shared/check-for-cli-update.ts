import ky from "ky"
import { detectPackageManager } from "lib/shared/detect-pkg-manager"
import { getGlobalDepsInstallCommand } from "lib/shared/get-dep-install-command"
import readline from "node:readline"
import { execSync } from "node:child_process"
import { program } from "cli/main"
import semver from "semver"
import { version as pkgVersion } from "../../package.json"
import kleur from "kleur"
import prompt from "prompts"

export const currentCliVersion = () =>
  program?.version() ?? semver.inc(pkgVersion, "patch") ?? pkgVersion

export const checkForTsciUpdates = async () => {
  if (process.env.TSCI_SKIP_CLI_UPDATE === "true") return
  const { version: latestCliVersion } = await ky
    .get<{ version: string }>(
      "https://registry.npmjs.org/@tscircuit/cli/latest",
      { throwHttpErrors: false },
    )
    .json()

  if (latestCliVersion && semver.gt(latestCliVersion, currentCliVersion())) {
    const { userWantsToUpdate } = await prompt({
      type: "confirm",
      name: "userWantsToUpdate",
      message: `A new version of tsci is available (${currentCliVersion()} → ${latestCliVersion}).\nWould you like to update now?`,
    })

    if (userWantsToUpdate) {
      const packageManager = detectPackageManager()
      const installCommand = getGlobalDepsInstallCommand(
        packageManager,
        "@tscircuit/cli@latest",
      )
      try {
        console.log(`Updating tsci using: ${installCommand}`)
        execSync(installCommand, { stdio: "inherit" })
        console.log(kleur.green("tsci has been updated successfully!"))
      } catch {
        console.warn("Update failed. You can try updating manually by running:")
        console.warn(`  ${installCommand}`)
      }
    }
  } else {
    return false
  }
  return true
}
