import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { assemblySvgCode } from "../../fixtures/system-diagram-code"

test("assembly SVG export renders component outlines and labels from TSX and Circuit JSON", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const source = path.join(tmpDir, "board.tsx")
  await writeFile(source, assemblySvgCode)
  for (const file of [source, path.join(tmpDir, "board.circuit.json")]) {
    const result = await runCommand(
      `tsci export ${file} -f assembly-svg -o assembly.svg --disable-parts-engine`,
    )
    expect(result.exitCode, result.stderr).toBe(0)
    const svg = await readFile(path.join(tmpDir, "assembly.svg"), "utf8")
    expect(svg).toContain("assembly-component")
    expect(svg).toContain(">R1<")
    expect(svg).not.toMatch(/NaN|Infinity/)
    if (file === source) {
      const json = await runCommand(
        `tsci export ${source} -f circuit-json --disable-parts-engine`,
      )
      expect(json.exitCode, json.stderr).toBe(0)
    }
  }
}, 30_000)

test("assembly SVG export reports a missing board instead of writing invalid geometry", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const source = path.join(tmpDir, "empty.circuit.json")
  await writeFile(source, "[]")
  const result = await runCommand(`tsci export ${source} -f assembly-svg`)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("No PCB board found")
  expect(
    await Bun.file(path.join(tmpDir, "empty.circuit-assembly.svg")).exists(),
  ).toBe(false)
})
