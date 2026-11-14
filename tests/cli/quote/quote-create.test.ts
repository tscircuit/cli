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
  "tsci quote create uploads the KiCad project and BOM to CircuitHub and prints its quotes",
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
      "tsci quote create board.circuit.tsx --workspace acme --export-classification EAR99 --quantity 5,10",
    )

    expect(exitCode).toBe(0)
    expect(stderr).toContain("Waiting for CircuitHub's CAM analysis...")
    expect(stdout).not.toContain("test-circuithub-token")

    // The whole KiCad project goes up, plus a BOM whose manufacturer is the
    // stocked listing from CircuitHub's part search.
    expect([...circuithub.uploads.keys()].sort()).toEqual([
      "board.kicad_pcb",
      "board.kicad_pro",
      "board.kicad_sch",
      "bom.csv",
    ])
    expect(circuithub.uploads.get("bom.csv")).toMatchInlineSnapshot(`
      "Reference Designators,Manufacturer,Manufacturer Part Number,Supplier,Supplier Part Number,Value
      "R1,R2",YAGEO,RC0402FR-071KL,Digi-Key,311-1.00KLRCT-ND,1k
      C1,,,,,100nF
      "
    `)
    expect(
      circuithub.requests.find((request) => request.path === "/v1/projects")
        ?.body,
    ).toEqual({
      name: "board",
      workspace: "acme",
      exportClassification: "EAR99",
      files: [
        "board.kicad_sch",
        "board.kicad_pcb",
        "board.kicad_pro",
        "bom.csv",
      ].map((filename) => ({
        filename,
        objectKey: `project-upload/1/${filename}`,
      })),
    })
    // Quoting waits for the CAM report (ready on the second board read).
    expect(
      circuithub.requests
        .map((request) => `${request.method} ${request.path}`)
        .filter((route) => !route.includes("/parts")),
    ).toEqual([
      "POST /v1/projects/upload-urls",
      "POST /v1/projects",
      "GET /v1/projects/9001/status",
      "GET /v1/revisions/77/board",
      "GET /v1/revisions/77/board",
      "GET /v1/projects/9001/bom",
      "POST /v1/quotes",
      "POST /v1/quotes",
    ])
    expect(stdout.trim()).toMatchInlineSnapshot(`
      "CircuitHub project 9001, revision 77 (workspace acme)
      No manufacturer part number in the design: C1
      BOM: 1/2 lines matched to a part by CircuitHub; unmatched: C1
      Board as measured by CircuitHub: 20 x 20 mm, 2 layers, min trace 0.15mm, min gap 0.15mm, min drill 0.3mm

      5 boards (quote 3005, expires 2026-11-14 13:00 UTC)
        Service   Fab  Ships                   Boards  Parts  Assembly  Discounts    Total  Per board
        flexible  CN   2026-11-25..2026-11-27  $20.00  $3.00    $80.00          -  $103.00     $20.60
        priority  US   2026-11-18              $50.00  $3.00   $100.00    -$30.00  $123.00     $24.60
        Discounts applied: Grid Proto
        Prices exclude shipping and tax
        Blocker: part_not_chosen (C1)
        Review and order (cheapest offer): https://app.circuithub.example/order?quantity=5&offer=2

      10 boards (quote 3010, expires 2026-11-14 13:00 UTC)
        Service   Fab  Ships                   Boards  Parts  Assembly  Discounts    Total  Per board
        flexible  CN   2026-11-25..2026-11-27  $20.00  $3.00    $80.00          -  $103.00     $10.30
        priority  US   2026-11-18              $60.00  $3.00   $100.00    -$30.00  $133.00     $13.30
        Discounts applied: Grid Proto
        Prices exclude shipping and tax
        Blocker: part_not_chosen (C1)
        Review and order (cheapest offer): https://app.circuithub.example/order?quantity=10&offer=2"
    `)
  },
  { timeout: 120_000 },
)
