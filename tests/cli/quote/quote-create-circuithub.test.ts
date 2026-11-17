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
      pcbX={-4}
      manufacturerPartNumber="RC0402FR-071KL"
      supplierPartNumbers={{ digikey: ["311-1.00KLRCT-ND"] }}
    />
    <resistor
      name="R2"
      resistance="1k"
      footprint="0402"
      pcbX={0}
      manufacturerPartNumber="RC0402FR-071KL"
      supplierPartNumbers={{ digikey: ["311-1.00KLRCT-ND"] }}
    />
    <capacitor name="C1" capacitance="100nF" footprint="0402" pcbX={4} />
  </board>
)
`

test(
  "tsci quote create --circuithub uploads the KiCad project, quotes right away, and refresh re-quotes once it's measured",
  async () => {
    const circuithub = await startFakeCircuithubServer()
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: {
        CIRCUITHUB_API_URL: circuithub.apiUrl,
        CIRCUITHUB_TOKEN: "test-circuithub-token",
      },
    })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const created = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99 --quantity 5,10",
    )

    expect(created.exitCode).toBe(0)
    expect(created.stdout).not.toContain("test-circuithub-token")

    // Only the KiCad project goes up: CircuitHub reads the part numbers
    // from it (it can't read tsci's BOM CSV).
    expect([...circuithub.uploads.keys()].sort()).toEqual([
      "board.kicad_pcb",
      "board.kicad_pro",
      "board.kicad_sch",
    ])
    expect(
      circuithub.requests.find((request) => request.path === "/v1/projects")
        ?.body,
    ).toEqual({
      name: "board",
      workspace: "acme",
      exportClassification: "EAR99",
      files: ["board.kicad_sch", "board.kicad_pcb", "board.kicad_pro"].map(
        (filename) => ({
          filename,
          objectKey: `project-upload/1/${filename}`,
        }),
      ),
    })
    // It quotes right after the import, before the board is measured.
    expect(
      circuithub.requests.map((request) => `${request.method} ${request.path}`),
    ).toEqual([
      "POST /v1/projects/upload-urls",
      "POST /v1/projects",
      "GET /v1/projects/9001/status",
      "GET /v1/revisions/77/board",
      "POST /v1/quotes",
      "POST /v1/quotes",
      "GET /v1/projects/9001/bom",
    ])
    expect(created.stdout.trim()).toMatchInlineSnapshot(`
      "CircuitHub quote: project 9001, revision 77 (workspace acme)

        Parts   1 of 2 matched by CircuitHub (1 do-not-place skipped); not matched: C1
        Board   20.1 × 20.1 mm, 2 layers, PRELIMINARY: CircuitHub is still measuring it
        Prices  exclude shipping and tax; valid until 2026-11-14 13:00 UTC

      5 boards
        Service   Made in  Ships      Discount    Total  Per board
        ────────  ───────  ─────────  ────────  ───────  ─────────
        flexible  CN       Nov 25–27         -  $103.00     $20.60
        priority  US       Nov 18            -  $153.00     $30.60
        Blocked: part not chosen (C1); choose it on the order page
        Order (cheapest): https://app.circuithub.example/order?quantity=5&offer=2

      10 boards
        Service   Made in  Ships      Discount    Total  Per board
        ────────  ───────  ─────────  ────────  ───────  ─────────
        flexible  CN       Nov 25–27         -  $103.00     $10.30
        priority  US       Nov 18            -  $163.00     $16.30
        Blocked: part not chosen (C1); choose it on the order page
        Order (cheapest): https://app.circuithub.example/order?quantity=10&offer=2

      PRELIMINARY: CircuitHub is still measuring the board (usually ~1.5 min after upload), so these prices may be wrong and miss Grid Proto.
      For final prices run: tsci quote refresh --circuithub 77"
    `)

    // The board is measured now; refresh re-quotes the same revision
    // without uploading again.
    circuithub.requests.length = 0
    const refreshed = await runCommand(
      "tsci quote refresh --circuithub --quantity 5,10",
    )
    expect(refreshed.exitCode).toBe(0)
    expect(
      circuithub.requests.map((request) => `${request.method} ${request.path}`),
    ).toEqual([
      "GET /v1/revisions/77/board",
      "POST /v1/quotes",
      "POST /v1/quotes",
      "GET /v1/projects/9001/bom",
    ])
    expect(refreshed.stdout.trim()).toMatchInlineSnapshot(`
      "CircuitHub quote: project 9001, revision 77

        Parts   1 of 2 matched by CircuitHub (1 do-not-place skipped); not matched: C1
        Board   20 × 20 mm, 2 layers, trace 0.15 mm, gap 0.15 mm, drill 0.3 mm
        Prices  exclude shipping and tax; valid until 2026-11-14 13:00 UTC
        Discount is CircuitHub's Grid Proto price

      5 boards
        Service   Made in  Ships      Discount    Total  Per board
        ────────  ───────  ─────────  ────────  ───────  ─────────
        flexible  CN       Nov 25–27         -  $103.00     $20.60
        priority  US       Nov 18      -$30.00  $123.00     $24.60
        Blocked: part not chosen (C1); choose it on the order page
        Order (cheapest): https://app.circuithub.example/order?quantity=5&offer=2

      10 boards
        Service   Made in  Ships      Discount    Total  Per board
        ────────  ───────  ─────────  ────────  ───────  ─────────
        flexible  CN       Nov 25–27         -  $103.00     $10.30
        priority  US       Nov 18      -$30.00  $133.00     $13.30
        Blocked: part not chosen (C1); choose it on the order page
        Order (cheapest): https://app.circuithub.example/order?quantity=10&offer=2"
    `)
  },
  { timeout: 120_000 },
)
