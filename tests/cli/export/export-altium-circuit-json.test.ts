import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("export Circuit JSON with a component-exempt keepout to a custom Altium archive path", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "board.circuit.json")
  await writeFile(
    circuitPath,
    JSON.stringify([
      {
        type: "pcb_board",
        pcb_board_id: "pcb_board_1",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        num_layers: 2,
        material: "fr4",
        thickness: 1.4,
      },
      {
        type: "source_component",
        source_component_id: "source_component_0",
        ftype: "simple_chip",
        name: "U2",
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_component_0",
        source_component_id: "source_component_0",
        center: { x: 0, y: 0 },
        width: 2,
        height: 2,
        rotation: 0,
        layer: "top",
      },
      {
        type: "pcb_keepout",
        pcb_keepout_id: "pcb_keepout_4",
        shape: "rect",
        center: { x: 0, y: 0 },
        width: 3,
        height: 3,
        layers: ["top", "bottom"],
        excluded_pcb_component_ids: ["pcb_component_0"],
      },
    ]),
  )
  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} -f altium -o custom.zip`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "custom.zip")),
  )
  const pcbBytes = await zip.file("board.circuit.PcbDoc")!.async("uint8array")
  const pcbText = new TextDecoder("latin1").decode(pcbBytes)
  expect(pcbText).toContain("RULEKIND=Clearance")
  expect(pcbText).toContain("SCOPE1EXPRESSION=IsKeepOut And InUnion(1)")
  expect(pcbText).toContain("SCOPE2EXPRESSION=InComponent('U2')")
  expect(zip.file("board.circuit.PrjPcb")).not.toBeNull()
  expect(zip.file("board.circuit.SchDoc")).not.toBeNull()
}, 60_000)
