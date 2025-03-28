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
import { registerInstall } from "./install/register"

export const program = new Command()
export { DevServer } from "./dev/DevServer"

program
  .name("tsci")
  .description("CLI for developing tscircuit snippets")
  .version(getVersion())

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

registerExport(program)
registerInstall(program)

if (process.argv.length === 2) {
  perfectCli(program, process.argv)
} else {
  program.parse()
}
