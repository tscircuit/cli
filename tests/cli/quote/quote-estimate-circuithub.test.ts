import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const BOARD_SOURCE = `export default () => (
  <board width="30mm" height="20mm">
    <resistor name="R1" resistance="10k" footprint="0402" pcbX={-6} manufacturerPartNumber="RC0402FR-0710KL" />
    <resistor name="R2" resistance="10k" footprint="0402" pcbX={-3} manufacturerPartNumber="RC0402FR-0710KL" />
    <capacitor name="C1" capacitance="100nF" footprint="0402" pcbX={0} manufacturerPartNumber="CL05B104KO5NNNC" />
    <capacitor name="C2" capacitance="100nF" footprint="0402" pcbX={3} layer="bottom" manufacturerPartNumber="CL05B104KO5NNNC" />
    <testpoint name="TP1" pcbX={8} />
  </board>
)
`

test(
  "tsci quote estimate --circuithub prices an assembled board offline",
  async () => {
    // No CircuitHub token, and an API URL nothing listens on: the estimate
    // must not need either.
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: {
        CIRCUITHUB_API_URL: "http://127.0.0.1:9/v1",
        CIRCUITHUB_TOKEN: "",
      },
    })
    await writeFile(path.join(tmpDir, "board.circuit.tsx"), BOARD_SOURCE)

    const json = await runCommand(
      "tsci quote estimate --circuithub board.circuit.tsx --quantity 10 --json",
    )
    expect(json.exitCode).toBe(0)
    const estimate = JSON.parse(json.stdout)
    expect(estimate).toMatchObject({
      quantity: 10,
      board: { widthMm: 30, heightMm: 20, layers: 2 },
      // The test point is not a part; C2 on the bottom makes a second BOM line.
      placements: 4,
      bomLines: 3,
      sides: 2,
    })
    expect(estimate.offers.map((offer: any) => offer.service)).toEqual([
      "priority_express",
      "priority",
      "standard",
      "flexible",
    ])
    for (const offer of estimate.offers) {
      expect(offer.total).toBeCloseTo(
        offer.boards + offer.parts + offer.assembly,
        1,
      )
    }
    // Grid Proto: 25% of boards and assembly at Priority, plus full-price parts.
    const express = estimate.offers[0]
    expect(estimate.gridProto.eligible).toBe(true)
    expect(estimate.gridProto.total).toBeCloseTo(
      express.parts + 0.25 * (express.boards + express.assembly),
      1,
    )

    const table = await runCommand(
      "tsci quote estimate --circuithub board.circuit.tsx --quantity 30",
    )
    expect(table.exitCode).toBe(0)
    expect(table.stdout).toContain("CircuitHub estimate (offline")
    expect(table.stdout).toContain("30 boards")
    expect(table.stdout).toContain(
      "No Grid Proto: more than 10 boards (Grid Proto covers 10 or fewer)",
    )
  },
  { timeout: 120_000 },
)
