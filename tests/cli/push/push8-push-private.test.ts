import { test, expect } from "bun:test"
import { Command } from "commander"
import { registerPush } from "cli/push/register"

test("push does not advertise or accept --private", () => {
  const program = new Command()
    .name("tsci")
    .exitOverride()
    .configureOutput({ writeErr: () => {} })
  registerPush(program)

  expect(program.commands[0]!.helpInformation()).not.toContain("--private")

  expect(() => program.parse(["push", "--private"], { from: "user" })).toThrow(
    "unknown option '--private'",
  )
})
