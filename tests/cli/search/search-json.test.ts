import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search --json outputs valid json with unified result list", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci search --tscircuit --json 555",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")

  const parsed = JSON.parse(stdout)
  expect(parsed.query).toBe("555")
  expect(Array.isArray(parsed.results)).toBe(true)
  expect(parsed.results.length).toBeGreaterThan(0)
  expect(parsed.results[0].source).toBe("tscircuit")
  expect(parsed.results[0].name).toBeString()
  expect(parsed.results[0].result).toBeUndefined()
})
