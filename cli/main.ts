#!/usr/bin/env node
import { Command } from "commander"
import { registerInit } from "./init/register"
import { registerDev } from "./dev/register"
import { registerAuthLogin } from "./auth/login/register"
import { registerAuthLogout } from "./auth/logout/register"
import { registerAuth } from "./auth/register"
import { registerConfig } from "./config/register"
import { registerConfigPrint } from "./config/print/register"
import { registerClone } from "./clone/register"
import { perfectCli } from "perfect-cli"
import { getVersion } from "./../lib/getVersion"
import { registerExport } from "./export/register"
import { registerAuthPrintToken } from "./auth/print-token/register"
import { registerAuthSetToken } from "./auth/set-token/register"
import { registerAuthWhoami } from "./auth/whoami/register"
import { registerPush } from "./push/register"
import { registerAdd } from "./add/register"
import { registerUpgradeCommand } from "./upgrade/register"
import { registerConfigSet } from "./config/set/register"
import { registerSearch } from "./search/register"
import { registerImport } from "./import/register"
import { registerRemove } from "./remove/register"
import { registerBuild } from "./build/register"
import { registerSnapshot } from "./snapshot/register"
import { registerSetup } from "./setup/register"
import { registerConvert } from "./convert/register"
import { registerSimulate } from "./simulate/register"
import { registerInstall } from "./install/register"
import { registerTranspile } from "./transpile/register"

// Register KiCad loader plugin for automatic .kicad_mod → Circuit JSON conversion
// Only register if running in Bun (plugin API is Bun-specific)
if (typeof Bun !== "undefined") {
  try {
    // Dynamic import to avoid bundling issues
    const kicadModule = await import("../lib/kicad/kicad-loader-plugin")
    kicadModule.registerKicadLoader()
  } catch (error) {
    // Plugin not available, users will need to manually parse .kicad_mod files
  }
}

export const program = new Command()

program.name("tsci").description("CLI for developing tscircuit packages")

registerInit(program)

registerDev(program)
registerClone(program)
registerPush(program)

registerAuth(program)
registerAuthLogin(program)
registerAuthLogout(program)
registerAuthPrintToken(program)
registerAuthSetToken(program)
registerAuthWhoami(program)

registerConfig(program)
registerConfigPrint(program)
registerConfigSet(program)

registerExport(program)
registerBuild(program)
registerTranspile(program)
registerAdd(program)
registerRemove(program)
registerSnapshot(program)
registerSetup(program)
registerInstall(program)
registerUpgradeCommand(program)

registerSearch(program)
registerImport(program)
registerConvert(program)
registerSimulate(program)

// Manually handle --version, -v, and -V flags
if (
  process.argv.includes("--version") ||
  process.argv.includes("-v") ||
  process.argv.includes("-V")
) {
  console.log(getVersion())
  process.exit(0)
}

// Add a custom version command
program
  .command("version")
  .description("Print CLI version")
  .action(() => {
    console.log(getVersion())
  })

if (process.argv.length === 2) {
  // perfectCli uses commander@12 internally which is not strictly
  // compatible with commander@14's TypeScript types. Cast to any to
  // avoid a type mismatch.
  perfectCli(program as any, process.argv).catch((err) => {
    // Handle cancelled interactive sessions gracefully
    if (err instanceof Error && err.name === "TypeError") {
      console.error("\nAborted.")
      process.exit(130)
    }
    throw err
  })
} else {
  program.parse()
}
