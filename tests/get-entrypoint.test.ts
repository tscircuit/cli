import { test, expect } from "bun:test"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { getEntrypoint } from "../lib/shared/get-entrypoint"
import * as path from "node:path"
import * as fs from "node:fs/promises"

test("getEntrypoint detects standard entrypoints", async () => {
  const { tmpDir } = await getCliTestFixture()
  
  // Create a standard entrypoint file
  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  
  // Test detection
  let onSuccessCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    onSuccess: () => { onSuccessCalled = true },
  })
  
  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "index.tsx"))
  expect(onSuccessCalled).toBeTrue()
})

test("getEntrypoint detects entrypoint from config", async () => {
  const { tmpDir } = await getCliTestFixture()
  
  // Create a config file with mainEntrypoint
  await fs.mkdir(path.join(tmpDir, "src"))
  await fs.writeFile(
    path.join(tmpDir, "src", "main.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  await fs.writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ mainEntrypoint: "src/main.circuit.tsx" })
  )
  
  // Test detection
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })
  
  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "src", "main.circuit.tsx"))
})

test("getEntrypoint detects entrypoint in common locations", async () => {
  const { tmpDir } = await getCliTestFixture()
  
  // Create a file in one of the common locations
  await fs.mkdir(path.join(tmpDir, "src"))
  await fs.writeFile(
    path.join(tmpDir, "src", "index.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  
  // Test detection
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })
  
  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "src", "index.circuit.tsx"))
})

test("getEntrypoint recursively finds entrypoints in child directories", async () => {
  const { tmpDir } = await getCliTestFixture()
  
  // Create a nested directory structure with an entrypoint
  await fs.mkdir(path.join(tmpDir, "components", "circuit1"), { recursive: true })
  await fs.writeFile(
    path.join(tmpDir, "components", "circuit1", "index.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  
  // Test detection
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })
  
  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "components", "circuit1", "index.circuit.tsx"))
})

test("getEntrypoint returns null when no entrypoint is found", async () => {
  const { tmpDir } = await getCliTestFixture()
  
  // Create a file that is not an entrypoint
  await fs.writeFile(
    path.join(tmpDir, "not-an-entrypoint.js"),
    'console.log("This is not an entrypoint");'
  )
  
  // Test detection
  let onErrorCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    onError: () => { onErrorCalled = true },
  })
  
  expect(entrypoint).toBeNull()
  expect(onErrorCalled).toBeTrue()
})

test("getEntrypoint prioritizes provided filePath over other detection methods", async () => {
  const { tmpDir } = await getCliTestFixture()
  
  // Create multiple potential entrypoints
  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  await fs.mkdir(path.join(tmpDir, "src"))
  await fs.writeFile(
    path.join(tmpDir, "src", "main.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  await fs.writeFile(
    path.join(tmpDir, "custom-entrypoint.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>'
  )
  
  // Test detection with provided filePath
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    filePath: "custom-entrypoint.tsx",
  })
  
  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "custom-entrypoint.tsx"))
})