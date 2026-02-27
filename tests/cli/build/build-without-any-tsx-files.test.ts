import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build without any tsx files and only circuit.json files are present", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitJsonPath = path.join(tmpDir, "prebuilt.circuit.json")
  await writeFile(
    circuitJsonPath,
    JSON.stringify([
      {
        type: "source_component",
        source_component_id: "source_component_0",
        name: "U1",
      },
    ]),
  )

  // Adding tscircuit to package.json to avoid's `TS2688` type error
  await writeFile(
    path.join(tmpDir, "package.json"),
    `{
    "name": "test-build-without-tsconfig",
    "version": "1.0.0",
    "dependencies": {
      "tscircuit": "latest"
    }
  }`,
  )

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["**/*.circuit.json"] }),
  )

  await runCommand(`tsci install`)
  const { stdout, exitCode } = await runCommand(`tsci build --ci`)

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Building 1 file(s)...")
  expect(stdout).toContain("Building prebuilt.circuit.json...")
  expect(stdout).toContain(
    "Skipping transpilation because includeBoardFiles is configured and no library entrypoint was found.",
  )

  const builtFromPrebuiltPath = JSON.parse(
    await readFile(
      path.join(tmpDir, "dist", "prebuilt", "circuit.json"),
      "utf-8",
    ),
  )
  expect(builtFromPrebuiltPath).toEqual([
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "U1",
    },
  ])
}, 30_000)

test("build treats nested circuit.json files as prebuilt outputs with concurrency", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await mkdir(path.join(tmpDir, "generated", "index"), { recursive: true })

  await writeFile(
    path.join(tmpDir, "generated", "index", "circuit.json"),
    JSON.stringify([
      {
        type: "source_component",
        source_component_id: "source_component_0",
        name: "U1",
      },
    ]),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    `{
    "name": "test-build-with-nested-circuit-json",
    "version": "1.0.0",
    "dependencies": {
      "tscircuit": "latest"
    }
  }`,
  )

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["**/circuit.json"] }),
  )

  await runCommand("tsci install")
  const { stdout, exitCode } = await runCommand(
    "tsci build --ci --concurrency 2",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Building 1 file(s) with concurrency 2...")
  expect(stdout).toContain(
    "Generating circuit JSON for generated/index/circuit.json...",
  )
  expect(stdout).toContain(
    "Skipping transpilation because includeBoardFiles is configured and no library entrypoint was found.",
  )

  const builtFromPrebuiltPath = JSON.parse(
    await readFile(
      path.join(tmpDir, "dist", "generated", "index", "circuit.json"),
      "utf-8",
    ),
  )
  expect(builtFromPrebuiltPath).toEqual([
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "U1",
    },
  ])
}, 30_000)
