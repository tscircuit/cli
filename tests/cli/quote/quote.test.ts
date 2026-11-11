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
    expect(stdout).toContain("PCB fabrication, 10 boards")
    expect(stdout).toContain("Shipping, UPS Express Saver (DDP)")
    expect(stdout).toContain("$20.00")
    expect(stdout).toContain("Grand total")
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
    expect(stderr).toContain(
      "Cannot assemble 6 boards from 5 PCBs; --assembled must not exceed --quantity",
    )
  },
  { timeout: 30_000 },
)

test(
  "tsci quote estimate validates its options",
  async () => {
    const { runCommand } = await getCliTestFixture()

    const invalidRuns = [
      ["--quantity 0", "Quantity must be a positive integer."],
      ["--assembled 1.5", "Assembled boards must be a positive integer."],
      [
        "--pcba cheapest",
        "PCBA type must be one of: auto, economic, standard.",
      ],
      [
        "--finish gold",
        "Surface finish must be one of: hasl_lead_free, hasl_leaded, enig.",
      ],
      ["--carrier fedex", "Carrier must be one of: dhl, ups."],
      ["--shipping-cost -1", "Shipping cost must be a number of at least 0."],
    ]
    for (const [flags, message] of invalidRuns) {
      const { stderr, exitCode } = await runCommand(
        `tsci quote estimate ${flags}`,
      )
      expect(exitCode).toBe(1)
      expect(stderr).toContain(message)
    }
  },
  { timeout: 60_000 },
)

test(
  "tsci quote create is still a placeholder that defaults to assembly",
  async () => {
    const { runCommand } = await getCliTestFixture()

    const { stdout, stderr, exitCode } = await runCommand("tsci quote create")

    expect(exitCode).toBe(1)
    expect(stdout).toBe("")
    expect(stderr).toContain("`tsci quote create` is not implemented yet.")
    expect(stderr).toContain(
      '{"file":null,"assembly":true,"quantity":5,"json":false}',
    )
  },
  { timeout: 30_000 },
)

test(
  "tsci quote create parses its flags",
  async () => {
    const { runCommand } = await getCliTestFixture()

    const { stderr, exitCode } = await runCommand(
      "tsci quote create board.circuit.tsx --no-assembly --quantity 20 --json",
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain(
      '{"file":"board.circuit.tsx","assembly":false,"quantity":20,"json":true}',
    )
  },
  { timeout: 30_000 },
)
