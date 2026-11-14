import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const BOARD_SOURCE = `export default () => (
  <board width="20mm" height="20mm">
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={-3} />
    <capacitor name="C1" capacitance="100nF" footprint="0402" pcbX={3} />
  </board>
)
`

test(
  "tsci quote estimate prices a bare board from its source file",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    // Without assembly no part is looked up, so this runs offline.
    const { stdout, exitCode } = await runCommand(
      "tsci quote estimate board.circuit.tsx --no-assembly --json",
    )

    expect(exitCode).toBe(0)
    const quote = JSON.parse(stdout)
    expect(quote.order).toMatchObject({
      quantity: 5,
      assembledQuantity: 0,
      assembly: "none",
      surfaceFinish: "hasl_lead_free",
      carrier: "dhl",
    })
    expect(quote.features).toMatchObject({
      widthMm: 20,
      heightMm: 20,
      numLayers: 2,
      material: "fr4",
    })
    // $2 special offer + $1 lead-free HASL + $1.05 production file check.
    expect(quote.fabricationTotal).toBe(4.05)
    expect(quote.summary.rows[0]).toMatchObject({
      key: "fabrication",
      total: 4.05,
      perBoard: 0.81,
      perBoardUnit: "pcb",
    })
    expect(quote.summary.grandTotal.total).toBe(quote.grandTotal)
  },
  { timeout: 60_000 },
)

test(
  "tsci quote estimate prints the summary table",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const { stdout, exitCode } = await runCommand(
      "tsci quote estimate board.circuit.tsx --no-assembly --quantity 10 --carrier ups --shipping-cost 20",
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain("Quote for board.circuit.tsx")
    // The summary table, from its header to the grand total's range.
    const summary = stdout.slice(
      stdout.indexOf("Total"),
      stdout.indexOf("\n\n", stdout.indexOf("Grand total")),
    )
    const destinationNote = stdout
      .split("\n")
      .find((line) => line.includes("Shipping and taxes assume"))
    expect(destinationNote?.trim()).toMatchInlineSnapshot(
      `"Shipping and taxes assume delivery to the United States with duties paid: 35% import duties and 8.625% sales tax (the rate on tscircuit's orders; it depends on the delivery address). Other destinations are not modelled."`,
    )
    expect(summary).toMatchInlineSnapshot(`
      "Total                   Per board
        PCB fabrication, 10 boards                               $7.05                 $0.71 / PCB
        Additional fees (1)                                      $0.20                 $0.02 / PCB
        Shipping, UPS Express Saver (DDP) (0.022kg)             $20.00                 $2.00 / PCB
        Import duties and taxes (35% of merchandise)             $2.54                 $0.25 / PCB
        Duty and tax disbursement fee                            $4.44                 $0.44 / PCB
        Sales tax (8.625% of merchandise)                        $0.63                 $0.06 / PCB
        ------------------------------------------------------------------------------------------
        Grand total                                             $34.86                 $3.49 / PCB
                                              (range $34.86 to $34.86)"
    `)
  },
  { timeout: 60_000 },
)

test(
  "tsci quote estimate refuses more assembled boards than PCBs",
  async () => {
    const { runCommand } = await getCliTestFixture()

    const { stderr, exitCode } = await runCommand(
      "tsci quote estimate board.circuit.tsx --quantity 5 --assembled 6",
    )

    expect(exitCode).toBe(1)
    expect(stderr.trim()).toMatchInlineSnapshot(
      `"Cannot assemble 6 boards from 5 PCBs; --assembled must not exceed --quantity"`,
    )
  },
  { timeout: 30_000 },
)

test(
  "tsci quote estimate validates its options",
  async () => {
    const { runCommand } = await getCliTestFixture()

    const errorsByFlags: Record<string, string> = {}
    for (const flags of [
      "--quantity 0",
      "--assembled 1.5",
      "--pcba cheapest",
      "--finish gold",
      "--carrier fedex",
      "--shipping-cost -1",
    ]) {
      const { stderr, exitCode } = await runCommand(
        `tsci quote estimate ${flags}`,
      )
      expect(exitCode).toBe(1)
      errorsByFlags[flags] = stderr.trim()
    }
    expect(errorsByFlags).toMatchInlineSnapshot(`
      {
        "--assembled 1.5": "error: option '--assembled <count>' argument '1.5' is invalid. Assembled boards must be a positive integer.",
        "--carrier fedex": "error: option '--carrier <carrier>' argument 'fedex' is invalid. Carrier must be one of: dhl, ups.",
        "--finish gold": "error: option '--finish <finish>' argument 'gold' is invalid. Surface finish must be one of: hasl_lead_free, hasl_leaded, enig.",
        "--pcba cheapest": "error: option '--pcba <type>' argument 'cheapest' is invalid. PCBA type must be one of: auto, economic, standard.",
        "--quantity 0": "error: option '--quantity <count>' argument '0' is invalid. Quantity must be a positive integer.",
        "--shipping-cost -1": "error: option '--shipping-cost <usd>' argument '-1' is invalid. Shipping cost must be a number of at least 0.",
      }
    `)
  },
  { timeout: 60_000 },
)

test(
  "tsci quote create explains what it needs before uploading anything",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: { CIRCUITHUB_TOKEN: undefined, CIRCUITHUB_API_KEY: undefined },
    })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const notLoggedIn = await runCommand(
      "tsci quote create board.circuit.tsx --workspace acme --export-classification EAR99",
    )
    expect(notLoggedIn.exitCode).toBe(1)
    expect(notLoggedIn.stderr).toContain(
      "Not logged in to CircuitHub (or the session expired). Run `tsci auth circuithub login`, or set CIRCUITHUB_TOKEN.",
    )

    const invalidQuantity = await runCommand("tsci quote create --quantity 5,0")
    expect(invalidQuantity.exitCode).toBe(1)
    expect(invalidQuantity.stderr.trim()).toMatchInlineSnapshot(
      `"error: option '--quantity <counts>' argument '5,0' is invalid. Quantity must be a positive integer or a comma-separated list of them."`,
    )
  },
  { timeout: 60_000 },
)

test(
  "tsci quote create requires an export classification for new CircuitHub projects",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: { CIRCUITHUB_TOKEN: "test-circuithub-token" },
    })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const { stderr, exitCode } = await runCommand(
      "tsci quote create board.circuit.tsx --workspace acme",
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain(
      "CircuitHub needs the board's export classification to create a project. Pass --export-classification (for example EAR99), or --project <id> to add a revision to an existing project.",
    )
  },
  { timeout: 60_000 },
)
