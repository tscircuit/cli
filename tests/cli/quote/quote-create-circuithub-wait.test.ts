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

test(
  "tsci quote create --circuithub --wait quotes once CircuitHub has measured the board",
  async () => {
    const circuithub = await startFakeCircuithubServer()
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: {
        CIRCUITHUB_API_URL: circuithub.apiUrl,
        CIRCUITHUB_TOKEN: "test-circuithub-token",
      },
    })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const { stdout, stderr, exitCode } = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99 --wait",
    )

    expect(exitCode).toBe(0)
    expect(stderr).toContain(
      "Waiting for CircuitHub to measure the board (usually ~1.5 min)...",
    )
    // The board is measured on the second read; only then is it quoted.
    expect(
      circuithub.requests.map((request) => `${request.method} ${request.path}`),
    ).toEqual([
      "POST /v1/projects/upload-urls",
      "POST /v1/projects",
      "GET /v1/projects/9001/status",
      "GET /v1/revisions/77/board",
      "GET /v1/revisions/77/board",
      "POST /v1/quotes",
      "GET /v1/projects/9001/bom",
    ])
    expect(stdout).toContain("Discount is CircuitHub's Grid Proto price")
    expect(stdout).not.toContain("PRELIMINARY")
  },
  { timeout: 120_000 },
)
