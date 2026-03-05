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

test("build uses config build.previewImages and writes root preview files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const firstCircuit = path.join(tmpDir, "first.circuit.tsx")
  const secondCircuit = path.join(tmpDir, "second.circuit.tsx")
  await writeFile(firstCircuit, circuitCode)
  await writeFile(secondCircuit, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      build: {
        previewImages: true,
      },
    }),
  )

  const { stdout } = await runCommand(`tsci build`)

  expect(stdout).toContain("Building 2 file(s)...")
  expect(stdout).not.toContain("with concurrency")
  expect((stdout.match(/Build complete/g) ?? []).length).toBe(1)

  expect(
    await stat(path.join(tmpDir, "dist", "schematic.svg")).then((stats) =>
      stats.isFile(),
    ),
  ).toBe(true)
  expect(
    await stat(path.join(tmpDir, "dist", "pcb.svg")).then((stats) =>
      stats.isFile(),
    ),
  ).toBe(true)
  expect(
    await stat(path.join(tmpDir, "dist", "3d.png")).then((stats) =>
      stats.isFile(),
    ),
  ).toBe(true)
}, 60_000)

test("build uses config build.glbs for each built source file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const firstCircuit = path.join(tmpDir, "first.circuit.tsx")
  const secondCircuit = path.join(tmpDir, "second.circuit.tsx")
  await writeFile(firstCircuit, circuitCode)
  await writeFile(secondCircuit, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      build: {
        glbs: true,
      },
    }),
  )

  const { stdout } = await runCommand(`tsci build`)

  expect(stdout).toContain("Building 2 file(s)...")
  expect(stdout).not.toContain("with concurrency")
  expect((stdout.match(/Build complete/g) ?? []).length).toBe(1)

  expect(
    await stat(path.join(tmpDir, "dist", "first", "3d.glb")).then((stats) =>
      stats.isFile(),
    ),
  ).toBe(true)
  expect(
    await stat(path.join(tmpDir, "dist", "second", "3d.glb")).then((stats) =>
      stats.isFile(),
    ),
  ).toBe(true)
}, 60_000)
