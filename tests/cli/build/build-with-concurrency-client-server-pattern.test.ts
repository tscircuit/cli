import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build with --ci generates index.html and circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const firstCircuitPath = path.join(tmpDir, "first.circuit.tsx")
  const secondCircuitPath = path.join(tmpDir, "second.circuit.tsx")
  const thirdCircuitPath = path.join(tmpDir, "third.circuit.tsx")
  await writeFile(firstCircuitPath, circuitCode)
  await writeFile(secondCircuitPath, circuitCode)
  await writeFile(thirdCircuitPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ dependencies: { react: "^19.2.0" } }, null, 2),
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./first.circuit.tsx",
      build: { glbs: true, previewImages: true },
    }),
  )

  await runCommand(`tsci install`)
  const { stdout } = await runCommand(`tsci build --ci --concurrency 3`)

  expect(stdout).toContain("Building 3 file(s) with concurrency 3")

  expect(
    (stdout.match(/to GLB in same worker/g) ?? []).length,
  ).toBeGreaterThanOrEqual(3)
  expect(stdout).toContain("[first] Written 3d.glb")
  expect(stdout).toContain("[second] Written 3d.glb")
  expect(stdout).toContain("[third] Written 3d.glb")

  expect(stdout).toContain(
    "Generating preview assets for dist/first in same worker",
  )
  expect(stdout).toContain("Generating preview images in worker threads")
  expect(stdout).not.toContain("Generating preview images for all builds")
  expect(stdout).not.toContain("Generating GLB models for all builds")

  const firstCircuitJsonPath = path.join(
    tmpDir,
    "dist",
    "first",
    "circuit.json",
  )
  expect(await stat(firstCircuitJsonPath).then((stats) => stats.isFile())).toBe(
    true,
  )
  const secondCircuitJsonPath = path.join(
    tmpDir,
    "dist",
    "second",
    "circuit.json",
  )
  expect(
    await stat(secondCircuitJsonPath).then((stats) => stats.isFile()),
  ).toBe(true)
  const thirdCircuitJsonPath = path.join(
    tmpDir,
    "dist",
    "third",
    "circuit.json",
  )
  expect(await stat(thirdCircuitJsonPath).then((stats) => stats.isFile())).toBe(
    true,
  )
}, 60_000)
