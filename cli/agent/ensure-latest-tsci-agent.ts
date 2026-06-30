import kleur from "kleur"
import { execSync } from "node:child_process"
import semver from "semver"
import { getGlobalDepsInstallCommand } from "lib/shared/get-dep-install-command"
import { getPackageManager } from "lib/shared/get-package-manager"
import { confirmInstallOrUpdate } from "./confirm-install-or-update"
import { TSCI_AGENT_PACKAGE_NAME } from "./constants"
import { getInstalledTsciAgentVersion } from "./get-installed-tsci-agent-version"
import { getLatestTsciAgentVersion } from "./get-latest-tsci-agent-version"

export async function ensureLatestTsciAgent() {
  const installedAgent = getInstalledTsciAgentVersion()
  const latestVersion = await getLatestTsciAgentVersion()

  if (!latestVersion && installedAgent.isInstalled) {
    console.warn(
      kleur.yellow(
        "Could not check the latest tsci-agent version. Running the installed tsci-agent.",
      ),
    )
    return true
  }

  const shouldInstall = !installedAgent.isInstalled
  const shouldUpdate = Boolean(
    installedAgent.isInstalled &&
      latestVersion &&
      (!installedAgent.version ||
        semver.gt(latestVersion, installedAgent.version)),
  )

  if (!shouldInstall && !shouldUpdate) return true

  const installCommand = getGlobalDepsInstallCommand(
    getPackageManager().name,
    `${TSCI_AGENT_PACKAGE_NAME}@latest`,
  )

  const action = shouldInstall ? "install" : "update"
  const actionGerund = shouldInstall ? "installing" : "updating"
  const versionDescription = shouldInstall
    ? latestVersion
      ? `v${latestVersion}`
      : "the latest version"
    : `${installedAgent.version ?? "unknown"} → ${latestVersion}`

  const confirmed = await confirmInstallOrUpdate(
    `${TSCI_AGENT_PACKAGE_NAME} ${versionDescription} is required. ${action[0]!.toUpperCase()}${action.slice(1)} it globally using \`${installCommand}\`?`,
  )

  if (!confirmed) {
    console.error(
      kleur.red(
        `Cannot run \`tsci agent\` without ${actionGerund} ${TSCI_AGENT_PACKAGE_NAME}.`,
      ),
    )
    console.error(`You can run this manually: ${installCommand}`)
    return false
  }

  try {
    console.log(kleur.gray(`> ${installCommand}`))
    execSync(installCommand, { stdio: "inherit" })
    return true
  } catch {
    console.error(kleur.red(`Failed to ${action} ${TSCI_AGENT_PACKAGE_NAME}.`))
    console.error(`You can try running this manually: ${installCommand}`)
    return false
  }
}
