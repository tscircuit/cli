import { expect, test } from "bun:test"
import { Command, CommanderError } from "commander"
import { registerBuild } from "cli/build/register"

test("build accepts a solver worker count independently of file concurrency", async () => {
  const program = new Command()
  registerBuild(program)
  const build = program.commands.find((command) => command.name() === "build")!
  build
    .exitOverride()
    .configureOutput({ writeErr: () => {} })
    .action(() => {})
  let errorCode: string | undefined
  try {
    await program.parseAsync(
      ["build", "--concurrency", "3", "--autorouter-threads", "2"],
      { from: "user" },
    )
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error
    errorCode = error.code
  }
  const { concurrency, autorouterThreads } = build.opts()
  expect({ concurrency, autorouterThreads, errorCode }).toMatchSnapshot()
})
