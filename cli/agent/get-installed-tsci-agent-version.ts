import { spawnSync } from "node:child_process"
import semver from "semver"
import { TSCI_AGENT_BINARY_NAME } from "./constants"

export function getInstalledTsciAgentVersion() {
  const result = spawnSync(TSCI_AGENT_BINARY_NAME, ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  })

  if (
    result.error &&
    (result.error as NodeJS.ErrnoException).code === "ENOENT"
  ) {
    return { isInstalled: false, version: null }
  }

  if (result.error) {
    return { isInstalled: false, version: null }
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  const version =
    semver.valid(output.trim()) ?? semver.coerce(output)?.version ?? null

  return { isInstalled: true, version }
}
