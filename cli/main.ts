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
import { registerPush } from "./push/register"
import { registerAdd } from "./add/register"
import { registerUpgradeCommand } from "./upgrade/register"
import { registerConfigSet } from "./config/set/register"
import { registerSearch } from "./search/register"
import { registerRemove } from "./remove/register"
import { registerSnapshot } from "./snapshot/register"

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

registerConfig(program)
registerConfigPrint(program)
registerConfigSet(program)

registerExport(program)
registerAdd(program)
registerRemove(program)
registerSnapshot(program)

registerUpgradeCommand(program)

registerSearch(program)

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
  perfectCli(program, process.argv)
} else {
  program.parse()
}
