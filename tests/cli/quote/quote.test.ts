import { expect, test } from "bun:test"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

for (const subcommand of ["estimate", "create"]) {
  test(
    `tsci quote ${subcommand} is a placeholder that defaults to assembly`,
    async () => {
      const { runCommand } = await getCliTestFixture()

      const { stdout, stderr, exitCode } = await runCommand(
        `tsci quote ${subcommand}`,
      )

      expect(exitCode).toBe(1)
      expect(stdout).toBe("")
      expect(stderr).toContain(
        `\`tsci quote ${subcommand}\` is not implemented yet.`,
      )
      expect(stderr).toContain(
        '{"file":null,"assembly":true,"quantity":5,"json":false}',
      )
    },
    { timeout: 30_000 },
  )

  test(
    `tsci quote ${subcommand} parses its flags`,
    async () => {
      const { runCommand } = await getCliTestFixture()

      const { stderr, exitCode } = await runCommand(
        `tsci quote ${subcommand} board.circuit.tsx --no-assembly --quantity 20 --json`,
      )

      expect(exitCode).toBe(1)
      expect(stderr).toContain(
        '{"file":"board.circuit.tsx","assembly":false,"quantity":20,"json":true}',
      )
    },
    { timeout: 30_000 },
  )

  test(
    `tsci quote ${subcommand} rejects an invalid quantity`,
    async () => {
      const { runCommand } = await getCliTestFixture()

      const { stderr, exitCode } = await runCommand(
        `tsci quote ${subcommand} --quantity 0`,
      )

      expect(exitCode).toBe(1)
      expect(stderr).toContain("Quantity must be a positive integer.")
      expect(stderr).not.toContain("is not implemented yet")
    },
    { timeout: 30_000 },
  )
}
