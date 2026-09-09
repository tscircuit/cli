import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("export TSX as a native Altium project archive", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "board.tsx")
  await writeFile(
    circuitPath,
    `export default () => (
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )`,
  )

  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} --format altium --disable-parts-engine`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")

  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "board-altium.zip")),
  )
  expect(Object.keys(zip.files).sort()).toEqual([
    "README.txt",
    "board.PcbDoc",
    "board.PrjPcb",
    "board.SchDoc",
  ])
  for (const extension of ["PcbDoc", "SchDoc"]) {
    const bytes = await zip.file(`board.${extension}`)!.async("uint8array")
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
    ])
  }
  const project = await zip.file("board.PrjPcb")!.async("string")
  expect(project).toContain("board.PcbDoc")
  expect(project).toContain("board.SchDoc")
}, 60_000)
