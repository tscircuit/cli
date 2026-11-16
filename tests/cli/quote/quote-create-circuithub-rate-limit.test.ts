import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

const BOARD_SOURCE = `export default () => (
  <board width="20mm" height="20mm">
    <resistor
      name="R1"
      resistance="1k"
      footprint="0402"
      manufacturerPartNumber="RC0402FR-071KL"
    />
  </board>
)
`

/**
 * CircuitHub rate-limits its API (about 20 requests per 30 seconds) and
 * answers with HTTP 429 and no Retry-After header. Quoting a real board
 * (17 part searches for the NEMA 8) runs into it, and `tsci quote create
 * --circuithub` gives up on the first 429 instead of waiting and retrying.
 */
test(
  "tsci quote create --circuithub waits out CircuitHub's rate limit",
  async () => {
    const circuithub = await startFakeCircuithubServer({
      rateLimitedPartSearches: 1,
    })
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: {
        CIRCUITHUB_API_URL: circuithub.apiUrl,
        CIRCUITHUB_TOKEN: "test-circuithub-token",
      },
    })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const { stdout, stderr, exitCode } = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99",
    )

    // What the user sees while CircuitHub is rate-limiting.
    expect(
      stderr
        .split("\n")
        .filter((line) => /CircuitHub|rate limit/i.test(line))
        .slice(0, 3)
        .join("\n"),
    ).toMatchSnapshot()

    expect(exitCode).toBe(0)
    expect(stdout).toContain("CircuitHub project 9001, revision 77")
  },
  { timeout: 120_000 },
)
