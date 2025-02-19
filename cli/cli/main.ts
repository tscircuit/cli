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
import pkg from "../package.json"
import semver from "semver"
import { registerExport } from "./export/register"
import { registerAuthPrintToken } from "./auth/print-token/register"
import { registerAuthSetToken } from "./auth/set-token/register"
import { registerPush } from "./push/register"

export const program = new Command()

program
  .name("tsci")
  .description("CLI for developing tscircuit snippets")
  // HACK: at build time the version is old, we need to
  // fix this at some point...
  .version(semver.inc(pkg.version, "patch") ?? pkg.version)

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

if (process.argv.length === 2) {
  perfectCli(program, process.argv)
} else {
  program.parse()
}
