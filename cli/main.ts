#!/usr/bin/env node
import { Command } from "commander"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"
import { perfectCli } from "perfect-cli"
import { getVersion } from "./../lib/getVersion"
import { registerAdd } from "./add/register"
import { registerAuthLogin } from "./auth/login/register"
import { registerAuthLogout } from "./auth/logout/register"
import { registerAuthPrintToken } from "./auth/print-token/register"
import { registerAuth } from "./auth/register"
import { registerAuthSetToken } from "./auth/set-token/register"
import { registerAuthSetupNpmrc } from "./auth/setup-npmrc/register"
import { registerAuthWhoami } from "./auth/whoami/register"
import { registerBuild } from "./build/register"
import { registerCheckNetlist } from "./check/netlist/register"
import { registerCheckPlacement } from "./check/placement/register"
import { registerCheck } from "./check/register"
import { registerCheckRouting } from "./check/routing/register"
import { registerClone } from "./clone/register"
import { registerConfigPrint } from "./config/print/register"
import { registerConfig } from "./config/register"
import { registerConfigSet } from "./config/set/register"
import { registerConvert } from "./convert/register"
import { registerDev } from "./dev/register"
import { registerDoctor } from "./doctor/register"
import { registerExport } from "./export/register"
import { registerImport } from "./import/register"
import { registerInit } from "./init/register"
import { registerInstall } from "./install/register"
import { registerPush } from "./push/register"
import { registerRemove } from "./remove/register"
import { registerSearch } from "./search/register"
import { registerSetup } from "./setup/register"
import { registerSimulate } from "./simulate/register"
import { registerSnapshot } from "./snapshot/register"
import { registerTranspile } from "./transpile/register"
import { registerUpgradeCommand } from "./upgrade/register"

export const program = new Command()

program.name("tsci").description("CLI for developing tscircuit packages")

registerStaticAssetLoaders()

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
registerAuthSetupNpmrc(program)

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
registerDoctor(program)
registerCheck(program)
registerCheckNetlist(program)
registerCheckPlacement(program)
registerCheckRouting(program)

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
