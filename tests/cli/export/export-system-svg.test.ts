import "bun-match-svg"
import { expect, test } from "bun:test"
import { readFile, writeFile, symlink } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { systemDiagramCode } from "../../fixtures/system-diagram-code"

test("system SVG export generates TSX pages and exports Circuit JSON with page selection", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await symlink(path.resolve("node_modules"), path.join(tmpDir, "node_modules"))
  const source = path.join(tmpDir, "system.tsx")
  await writeFile(source, systemDiagramCode)
  const result = await runCommand(
    `tsci export ${source} -f system-svg --disable-parts-engine`,
  )
  expect(result.exitCode, result.stderr).toBe(0)
  const svg = await readFile(path.join(tmpDir, "system-system.svg"), "utf8")
  expect(svg).toContain('class="tscircuit-system"')
  expect(svg).toContain("Main controller")
  expect(svg).toContain("I2C")
  expect(svg).not.toContain("Radio module")
  expect(svg).not.toMatch(/NaN|Infinity/)
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "system-overview")

  const json = await runCommand(
    `tsci export ${source} -f circuit-json --disable-parts-engine`,
  )
  expect(json.exitCode, json.stderr).toBe(0)
  const circuitPath = path.join(tmpDir, "system.circuit.json")
  const pages = JSON.parse(await readFile(circuitPath, "utf8")).filter(
    (e: any) => e.type === "system_block_page",
  )
  for (const selector of ["Detail", pages[1].system_block_page_id]) {
    const selected = await runCommand(
      `tsci export ${circuitPath} -f system-svg --system-page ${selector} -o selected.svg`,
    )
    expect(selected.exitCode, selected.stderr).toBe(0)
    const detail = await readFile(path.join(tmpDir, "selected.svg"), "utf8")
    expect(detail).toContain("Radio module")
    expect(detail).not.toContain("Main controller")
    await expect(detail).toMatchSvgSnapshot(import.meta.path, "system-detail")
  }
  const missing = await runCommand(
    `tsci export ${circuitPath} -f system-svg --system-page missing`,
  )
  expect(missing.exitCode).toBe(1)
  expect(missing.stderr).toContain("not found")
  const invalid = await runCommand(
    `tsci export ${circuitPath} -f json --system-page Detail`,
  )
  expect(invalid.exitCode).toBe(1)
  expect(invalid.stderr).toContain("--system-page requires --format system-svg")
}, 60_000)

test("system SVG export reports missing pages without writing an SVG", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const source = path.join(tmpDir, "empty.circuit.json")
  await writeFile(source, "[]")
  const result = await runCommand(`tsci export ${source} -f system-svg`)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("No system pages found")
  expect(
    await Bun.file(path.join(tmpDir, "empty.circuit-system.svg")).exists(),
  ).toBe(false)
})
