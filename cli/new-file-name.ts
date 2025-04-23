import type { CliConfig } from "lib/cli-config"

/**
 * The CLI context contains information that is commonly passed to all functions
 */
export interface CliContext {
  cliConfig: CliConfig
}
