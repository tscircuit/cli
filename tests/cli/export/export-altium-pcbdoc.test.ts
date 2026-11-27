import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const OLE_CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

test("export -f altium -o board.PcbDoc writes a native OLE/CFB PcbDoc instead of a zip archive", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "outline-only.tsx")
  const pcbDocPath = path.join(tmpDir, "board.PcbDoc")
  const schDocPath = path.join(tmpDir, "board.SchDoc")

  await writeFile(
    circuitPath,
    `export default () => <board width="50mm" height="30mm" />\n`,
  )

  const pcbResult = await runCommand(
    `tsci export ${circuitPath} -f altium -o ${pcbDocPath} --disable-parts-engine`,
  )
  expect(pcbResult.exitCode).toBe(0)
  expect(pcbResult.stderr).toBe("")

  const pcbBytes = await readFile(pcbDocPath)
  expect(Array.from(pcbBytes.subarray(0, 8))).toEqual(OLE_CFB_SIGNATURE)
  expect(new TextDecoder("latin1").decode(pcbBytes)).toContain("PCB 6.0 Binary")

  const schResult = await runCommand(
    `tsci export ${circuitPath} -f altium -o ${schDocPath} --disable-parts-engine`,
  )
  expect(schResult.exitCode).toBe(0)
  expect(schResult.stderr).toBe("")

  const schBytes = await readFile(schDocPath)
  expect(Array.from(schBytes.subarray(0, 8))).toEqual(OLE_CFB_SIGNATURE)
  expect(new TextDecoder("latin1").decode(schBytes)).toContain(
    "Schematic Capture Binary File",
  )

  const invalidExtResult = await runCommand(
    `tsci export ${circuitPath} -f altium -o ${path.join(tmpDir, "board.PrjPcb")} --disable-parts-engine`,
  )
  expect(invalidExtResult.exitCode).toBe(1)
  expect(invalidExtResult.stderr).toContain(".zip, .PcbDoc, or .SchDoc")
}, 60_000)
