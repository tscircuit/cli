import { expect, test } from "bun:test"
import { Command } from "commander"
import { registerBuild } from "cli/build/register"

const createBuildCommand = () => {
  const program = new Command()
  registerBuild(program)
  const build = program.commands.find((command) => command.name() === "build")!
  build
    .exitOverride()
    .configureOutput({ writeErr: () => {} })
    .action(() => {})
  return { program, build }
}

test.each([1, 2, 8])(
  "build accepts %i autorouter threads independently of file concurrency",
  async (count) => {
    const { program, build } = createBuildCommand()
    await program.parseAsync(
      ["build", "--autorouter-threads", String(count), "--concurrency", "3"],
      { from: "user" },
    )
    expect(build.opts().autorouterThreads).toBe(count)
    expect(build.opts().concurrency).toBe("3")
  },
)

test("omitting --autorouter-threads leaves the platform default unresolved", async () => {
  const { program, build } = createBuildCommand()
  await program.parseAsync(["build"], { from: "user" })
  expect(build.opts().autorouterThreads).toBeUndefined()
})

test.each([
  "0",
  "-1",
  "1.5",
  "two",
  "2workers",
  "Infinity",
  "9007199254740992",
])(
  "build rejects invalid autorouter thread count %s before running its action",
  async (value) => {
    const { program, build } = createBuildCommand()
    let actionCalled = false
    build.action(() => {
      actionCalled = true
    })
    await expect(
      program.parseAsync(["build", "--autorouter-threads", value], {
        from: "user",
      }),
    ).rejects.toMatchObject({ code: "commander.invalidArgument" })
    expect(actionCalled).toBe(false)
  },
)
