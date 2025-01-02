import Configstore from "configstore"
import type { TypedConfigstore } from "./TypedConfigStore"

export interface CliConfig {
  sessionToken?: string
  githubUsername?: string
  registryApiUrl?: string
}

export const cliConfig: TypedConfigstore<CliConfig> = new Configstore(
  "tscircuit",
)

export const getRegistryApiUrl = (): string => {
  return cliConfig.get("registryApiUrl") ?? "https://registry-api.tscircuit.com"
}
