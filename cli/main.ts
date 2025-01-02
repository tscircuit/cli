#!/usr/bin/env node
import { Command } from "commander"
import { registerDev } from "./dev/register"
import { registerAuthLogin } from "./auth/login/register"
import { registerAuthLogout } from "./auth/logout/register"

const program = new Command()

program
  .name("snippets")
  .description("CLI for developing tscircuit snippets")
  .version("1.0.0")

registerDev(program)
registerAuthLogin(program)
registerAuthLogout(program)

program.parse()
