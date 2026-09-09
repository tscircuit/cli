import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("export Circuit JSON to a custom Altium archive path", async () => {
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
  expect(zip.file("board.circuit.PcbDoc")).not.toBeNull()
  expect(zip.file("board.circuit.PrjPcb")).not.toBeNull()
  expect(zip.file("board.circuit.SchDoc")).not.toBeNull()
}, 60_000)
