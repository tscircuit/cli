import ky from "ky"
import { getPackageManager } from "./get-package-manager"
import { getGlobalDepsInstallCommand } from "lib/shared/get-dep-install-command"
import { execSync } from "node:child_process"
import { program } from "cli/main"
import semver from "semver"
import { version as pkgVersion } from "../../package.json"
import kleur from "kleur"
import { prompts } from "lib/utils/prompts"
import { shouldBeInteractive } from "lib/utils/should-be-interactive"

export const currentCliVersion = () =>
  program?.version() ?? semver.inc(pkgVersion, "patch") ?? pkgVersion

export const getLatestVersion = async () => {
  if (process.env.TSCI_FAKE_LATEST_VERSION) {
    return process.env.TSCI_FAKE_LATEST_VERSION
  }
  const { version: latestCliVersion } = await ky
    .get<{ version: string }>(
      "https://registry.npmjs.org/@tscircuit/cli/latest",
      { throwHttpErrors: false },
    )
    .json()
  return latestCliVersion
}

export const checkForTsciUpdates = async (opts?: {
  nonInteractive?: boolean
}) => {
  if (process.env.TSCI_SKIP_CLI_UPDATE === "true") return false

  const latestCliVersion = await getLatestVersion()
  if (!latestCliVersion) return false

  if (semver.gt(latestCliVersion, currentCliVersion())) {
    if (opts?.nonInteractive || !shouldBeInteractive()) {
      const installCommand = getGlobalDepsInstallCommand(
        getPackageManager().name,
        "@tscircuit/cli@latest",
      )
      console.log(
        `A new version of tsci is available (${currentCliVersion()} → ${latestCliVersion}). Run \`${installCommand}\` to update.`,
      )
      return false
    }

    const { userWantsToUpdate } = await prompts({
      type: "confirm",
      name: "userWantsToUpdate",
      message: `A new version of tsci is available (${currentCliVersion()} → ${latestCliVersion}).\nWould you like to update now?`,
    })

    if (userWantsToUpdate) {
      return await updateTsci()
    }
  }
  return false
}

export const updateTsciIfNewVersionIsAvailable = async () => {
  const latestCliVersion = await getLatestVersion()
  if (!latestCliVersion) return false

  if (semver.gt(latestCliVersion, currentCliVersion())) {
    return await updateTsci()
  }
  return false
}

export const updateTsci = async () => {
  const packageManager = getPackageManager()
  const installCommand = getGlobalDepsInstallCommand(
    packageManager.name,
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
  return true
}
