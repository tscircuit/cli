import { expect, test } from "bun:test"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { scene } from "../../fixtures/x-ray-scene"

test("CLI exports X-Ray SVG/PNG and snapshots with multiple nets", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(join(tmpDir, "board.circuit.json"), JSON.stringify(scene))
  let result = await runCommand(
    "tsci export board.circuit.json -f pcb-svg --x-ray-net CLK --hidden-layer-opacity 0.05 -o xray.svg",
  )
  expect(result.exitCode).toBe(0)
  const svg = await Bun.file(join(tmpDir, "xray.svg")).text()
  expect(svg).toContain('data-x-ray="selected"')
  expect(svg).toContain('opacity="0.05"')
  expect(svg).not.toContain('data-type="pcb_board"')
  result = await runCommand(
    "tsci export board.circuit.json -f pcb-png --x-ray-net CLK --hidden-layer-opacity 0.05 -o xray.png",
  )
  expect(result.exitCode).toBe(0)
  const png = new Uint8Array(
    await Bun.file(join(tmpDir, "xray.png")).arrayBuffer(),
  )
  expect(Buffer.from(png).toString("base64")).toBe(
    new Resvg(svg).render().asPng().toString("base64"),
  )
  result = await runCommand(
    "tsci export board.circuit.json -f pcb-svg --x-ray-net source_a --x-ray-net source_b --layer bottom -o both.svg",
  )
  expect(result.exitCode).toBe(0)
  const both = await Bun.file(join(tmpDir, "both.svg")).text()
  expect(both).not.toBe(svg)
  result = await runCommand(
    "tsci snapshot board.circuit.json --x-ray-net CLK --hidden-layer-opacity 0.05 --update",
  )
  expect(result.exitCode).toBe(0)
  expect(
    await Bun.file(
      join(tmpDir, "__snapshots__/board.circuit-pcb-xray.snap.svg"),
    ).text(),
  ).toBe(svg)
}, 60000)

test("CLI rejects invalid X-Ray selectors, opacity, and incompatible output modes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(join(tmpDir, "board.circuit.json"), JSON.stringify(scene))
  for (const [command, message] of [
    [
      "export board.circuit.json -f pcb-svg --x-ray-net missing",
      "No connected PCB net",
    ],
    [
      "export board.circuit.json -f pcb-svg --x-ray-net CLK --hidden-layer-opacity 2",
      "between 0 and 1",
    ],
    [
      "export board.circuit.json -f schematic-svg --x-ray-net CLK",
      "require --format pcb-svg or pcb-png",
    ],
    [
      "snapshot board.circuit.json --schematic-only --x-ray-net CLK",
      "cannot be combined",
    ],
  ]) {
    const result = await runCommand("tsci " + command)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain(message)
  }
}, 60000)
