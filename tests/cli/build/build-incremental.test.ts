import { expect, test } from "bun:test"
import { readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default function IncrementalFixture() {
  console.log("Rendering incremental fixture")
  return (
  <board width={20} height={10} routingDisabled>
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={1} />
  </board>
  )
}
`

test("incremental builds reuse unchanged geometry and regenerate after a source edit", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const sourcePath = path.join(tmpDir, "index.circuit.tsx")
  const outputPath = path.join(tmpDir, "dist/index/circuit.json")
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(sourcePath, circuitCode)

  const first = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  const originalJson = await readFile(outputPath, "utf8")
  const second = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(first.exitCode).toBe(0)
  expect(first.stdout).toContain("Incremental build cache: miss")
  expect(first.stdout).toContain("Rendering incremental fixture")
  expect(second.stdout).toContain("Incremental build cache: hit")
  expect(second.stdout).not.toContain("Rendering incremental fixture")
  expect(await readFile(outputPath, "utf8")).toBe(originalJson)

  await writeFile(sourcePath, circuitCode.replace("pcbX={1}", "pcbX={2}"))
  const changed = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(changed.stdout).toContain("Incremental build cache: miss")
  const changedCircuit = JSON.parse(await readFile(outputPath, "utf8"))
  expect(
    changedCircuit.find(
      (element: { type: string }) => element.type === "pcb_component",
    ).center.x,
  ).toBe(2)
}, 30_000)

test("incremental builds invalidate imported assets and lockfiles", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    `import placement from "./placement.json"; ${circuitCode.replace("pcbX={1}", "pcbX={placement.x}")}`,
  )
  await writeFile(path.join(tmpDir, "placement.json"), JSON.stringify({ x: 1 }))
  await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  await writeFile(path.join(tmpDir, "placement.json"), JSON.stringify({ x: 2 }))
  const assetChanged = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(assetChanged.stdout).toContain("Incremental build cache: miss")
  const circuit = JSON.parse(
    await readFile(path.join(tmpDir, "dist/index/circuit.json"), "utf8"),
  )
  expect(
    circuit.find(
      (element: { type: string }) => element.type === "pcb_component",
    ).center.x,
  ).toBe(2)
  await writeFile(path.join(tmpDir, "bun.lock"), "{}")
  const lockChanged = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(lockChanged.stdout).toContain("Incremental build cache: miss")
}, 30_000)

test("worker builds share cached geometry with sequential builds and recreate output files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await symlink(
    path.resolve("node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(path.join(tmpDir, "index.circuit.tsx"), circuitCode)
  const first = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine --concurrency 2",
  )
  const outputPath = path.join(tmpDir, "dist/index/circuit.json")
  const originalJson = await readFile(outputPath, "utf8")
  await rm(path.join(tmpDir, "dist"), { recursive: true })
  const second = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(first.exitCode).toBe(0)
  expect(second.stdout).toContain("Incremental build cache: hit")
  expect(await readFile(outputPath, "utf8")).toBe(originalJson)
}, 30_000)

test("damaged cache files rebuild and an ordinary build stays fresh", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(path.join(tmpDir, "index.circuit.tsx"), circuitCode)
  await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  const cacheDir = path.join(tmpDir, ".tscircuit/build-cache")
  const [cacheFile] = await readdir(cacheDir)
  const cachePath = path.join(cacheDir, cacheFile)
  const cachedBuild = JSON.parse(await readFile(cachePath, "utf8"))
  cachedBuild.circuit_json = "[]"
  await writeFile(cachePath, JSON.stringify(cachedBuild))
  const repaired = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(repaired.exitCode).toBe(0)
  expect(repaired.stdout).toContain("Incremental build cache: miss")
  const fresh = await runCommand(
    "tsci build index.circuit.tsx --disable-parts-engine",
  )
  expect(fresh.exitCode).toBe(0)
  expect(fresh.stdout).not.toContain("Incremental build cache:")
}, 30_000)

test("cached DRC errors keep their exit status and honor the current reporting policy", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    circuitCode.replace("pcbX={1}", "pcbX={12}"),
  )
  const first = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  const second = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(first.exitCode).toBe(1)
  expect(second.exitCode).toBe(1)
  expect(second.stdout).toContain("Incremental build cache: hit")
  expect(second.stdout).toContain("Build completed with errors")
  const ignored = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine --ignore-errors",
  )
  expect(ignored.stdout).toContain("Incremental build cache: hit")
  expect(ignored.exitCode).toBe(0)
}, 30_000)

test("changed generation flags invalidate the cache and debug requests bypass it", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(path.join(tmpDir, "index.circuit.tsx"), circuitCode)
  await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  const changed = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine --disable-pcb",
  )
  expect(changed.stdout).toContain("Incremental build cache: miss")
  const debugged = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine --solver-debug",
  )
  expect(debugged.stdout).toContain("Incremental build cache: disabled")
}, 30_000)

test("render failures are retried instead of becoming cached board results", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    `
    export const circuitJson = [{
      type: "source_runtime_error",
      source_runtime_error_id: "source_runtime_error_0",
      error_type: "source_runtime_error",
      phase_name: "PcbFootprintStringRender",
      message: "Temporary footprint loading failure",
    }]
  `,
  )
  const first = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  const retry = await runCommand(
    "tsci build index.circuit.tsx --incremental --disable-parts-engine",
  )
  expect(first.exitCode).toBe(1)
  expect(retry.exitCode).toBe(1)
  expect(retry.stdout).toContain("Incremental build cache: disabled")
  expect(
    await readdir(path.join(tmpDir, ".tscircuit/build-cache")).catch(() => []),
  ).toHaveLength(0)
}, 30_000)
