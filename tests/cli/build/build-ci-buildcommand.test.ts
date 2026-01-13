import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"

test("build --ci executes buildCommand from tscircuit.config.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const markerFile = "build-command-executed.txt"
  const markerContent = "buildCommand was executed successfully"

  const buildCommand = `node -e "require('fs').writeFileSync('${markerFile}', '${markerContent}')"`

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      buildCommand,
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-build-ci",
      version: "1.0.0",
    }),
  )

  const { stdout, stderr } = await runCommand("tsci build --ci")

  const markerPath = path.join(tmpDir, markerFile)
  const markerExists = await stat(markerPath)
    .then(() => true)
    .catch(() => false)

  expect(markerExists).toBe(true)

  const content = await readFile(markerPath, "utf-8")
  expect(content).toBe(markerContent)

  expect(stdout).toContain("Running:")
}, 60_000)

test("build --ci executes prebuildCommand before buildCommand", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const prebuildMarker = "prebuild-executed.txt"
  const buildMarker = "build-executed.txt"

  const prebuildCommand = `node -e "require('fs').writeFileSync('${prebuildMarker}', Date.now().toString())"`
  const buildCommand = `node -e "require('fs').writeFileSync('${buildMarker}', Date.now().toString())"`

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      prebuildCommand,
      buildCommand,
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-build-ci-order",
      version: "1.0.0",
    }),
  )

  await runCommand("tsci build --ci")

  const prebuildPath = path.join(tmpDir, prebuildMarker)
  const buildPath = path.join(tmpDir, buildMarker)

  const prebuildContent = await readFile(prebuildPath, "utf-8")
  const buildContent = await readFile(buildPath, "utf-8")

  const prebuildTime = parseInt(prebuildContent, 10)
  const buildTime = parseInt(buildContent, 10)

  expect(prebuildTime).toBeLessThanOrEqual(buildTime)
}, 60_000)

test("build --ci without buildCommand uses default CI build options", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({}),
  )

  await writeFile(path.join(tmpDir, "index.tsx"), circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-build-ci-default",
      version: "1.0.0",
    }),
  )

  const { stdout } = await runCommand("tsci build --ci")

  expect(stdout).toContain("Building")
}, 60_000)
