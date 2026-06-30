import ky from "ky"
import semver from "semver"
import { TSCI_AGENT_PACKAGE_NAME } from "./constants"

export async function getLatestTsciAgentVersion() {
  try {
    const { version } = await ky
      .get<{ version?: string }>(
        `https://registry.npmjs.org/${TSCI_AGENT_PACKAGE_NAME}/latest`,
        { throwHttpErrors: false },
      )
      .json()

    return version && semver.valid(version) ? version : null
  } catch {
    return null
  }
}
