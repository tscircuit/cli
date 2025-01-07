#!/usr/bin/env node
import { Command } from "commander"
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

const program = new Command()

program
  .name("tsci")
  .description("CLI for developing tscircuit snippets")
  // HACK: at build time the version is old, we need to
  // fix this at some point...
  .version(semver.inc(pkg.version, "patch") ?? pkg.version)

registerDev(program)
registerClone(program)

registerAuth(program)
registerAuthLogin(program)
registerAuthLogout(program)

registerConfig(program)
registerConfigPrint(program)

if (process.argv.length === 2) {
  perfectCli(program, process.argv)
} else {
  program.parse()
}
