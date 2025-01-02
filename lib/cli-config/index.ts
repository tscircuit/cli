import Configstore from "configstore"
import type { TypedConfigstore } from "./TypedConfigStore"

export interface CliConfig {
  sessionToken?: string
  githubUsername?: string
}

export const cliConfig: TypedConfigstore<CliConfig> = new Configstore(
  "tscircuit",
)
