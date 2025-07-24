import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test.skip("import command generates package from JLCPCB part", async () => {
  const { runCommand } = await getCliTestFixture({ loggedIn: true })
  const { stdout, stderr } = await runCommand("tsci import 555")
  expect(stderr).toBe("")
  expect(stdout.toLowerCase()).toContain("imported")
}, 20_000)
