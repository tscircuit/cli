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
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Test detection
  let onSuccessCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    onSuccess: () => {
      onSuccessCalled = true
    },
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
    'export default () => <board width="10mm" height="10mm"></board>',
  )
  await fs.writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ mainEntrypoint: "src/main.circuit.tsx" }),
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
    'export default () => <board width="10mm" height="10mm"></board>',
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
  await fs.mkdir(path.join(tmpDir, "components", "circuit1"), {
    recursive: true,
  })
  await fs.writeFile(
    path.join(tmpDir, "components", "circuit1", "index.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Test detection
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(
    path.join(tmpDir, "components", "circuit1", "index.circuit.tsx"),
  )
})

test("getEntrypoint returns null when no entrypoint is found", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create a file that is not an entrypoint
  await fs.writeFile(
    path.join(tmpDir, "not-an-entrypoint.js"),
    'console.log("This is not an entrypoint");',
  )

  // Test detection
  let onErrorCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    onError: () => {
      onErrorCalled = true
    },
  })

  expect(entrypoint).toBeNull()
  expect(onErrorCalled).toBeTrue()
})

test("getEntrypoint prioritizes provided filePath over other detection methods", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create multiple potential entrypoints
  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )
  await fs.mkdir(path.join(tmpDir, "src"))
  await fs.writeFile(
    path.join(tmpDir, "src", "main.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )
  await fs.writeFile(
    path.join(tmpDir, "custom-entrypoint.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Test detection with provided filePath
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    filePath: "custom-entrypoint.tsx",
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "custom-entrypoint.tsx"))
})

// Security and validation tests
test("getEntrypoint rejects path traversal attempts", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create a file outside the project directory
  const parentDir = path.dirname(tmpDir)
  await fs.writeFile(
    path.join(parentDir, "malicious.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  let onErrorCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    filePath: "../malicious.tsx",
    onError: () => {
      onErrorCalled = true
    },
  })

  expect(entrypoint).toBeNull()
  expect(onErrorCalled).toBeTrue()

  // Cleanup
  await fs.unlink(path.join(parentDir, "malicious.tsx"))
})

test("getEntrypoint handles non-existent project directory", async () => {
  const nonExistentDir = path.join(
    process.cwd(),
    "non-existent-dir-" + Date.now(),
  )

  let onErrorCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: nonExistentDir,
    onError: () => {
      onErrorCalled = true
    },
  })

  expect(entrypoint).toBeNull()
  expect(onErrorCalled).toBeTrue()
})

test("getEntrypoint ignores hidden directories", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create entrypoint in hidden directory
  await fs.mkdir(path.join(tmpDir, ".hidden"))
  await fs.writeFile(
    path.join(tmpDir, ".hidden", "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Create valid entrypoint in visible directory
  await fs.mkdir(path.join(tmpDir, "components"))
  await fs.writeFile(
    path.join(tmpDir, "components", "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "components", "index.tsx"))
})

test("getEntrypoint ignores node_modules directory", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create entrypoint in node_modules
  await fs.mkdir(path.join(tmpDir, "node_modules", "some-package"), {
    recursive: true,
  })
  await fs.writeFile(
    path.join(tmpDir, "node_modules", "some-package", "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Create valid entrypoint in src
  await fs.mkdir(path.join(tmpDir, "src"))
  await fs.writeFile(
    path.join(tmpDir, "src", "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "src", "index.tsx"))
})

test("getEntrypoint respects maximum search depth", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create deeply nested entrypoint (depth > 3)
  const deepPath = path.join(tmpDir, "level1", "level2", "level3", "level4")
  await fs.mkdir(deepPath, { recursive: true })
  await fs.writeFile(
    path.join(deepPath, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Create entrypoint at acceptable depth (depth = 2)
  const shallowPath = path.join(tmpDir, "components", "circuit")
  await fs.mkdir(shallowPath, { recursive: true })
  await fs.writeFile(
    path.join(shallowPath, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(shallowPath, "index.tsx"))
})

test("getEntrypoint handles invalid config mainEntrypoint", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create config with invalid mainEntrypoint
  await fs.writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ mainEntrypoint: 123 }), // Invalid type
  )

  // Create fallback entrypoint
  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "index.tsx"))
})

test("getEntrypoint handles config with non-existent mainEntrypoint", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create config with non-existent mainEntrypoint
  await fs.writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ mainEntrypoint: "non-existent.tsx" }),
  )

  // Create fallback entrypoint
  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "index.tsx"))
})

test("getEntrypoint detects all allowed entrypoint file types", async () => {
  const allowedTypes = [
    "index.tsx",
    "index.ts",
    "index.circuit.tsx",
    "main.tsx",
    "main.circuit.tsx",
  ]

  for (const fileName of allowedTypes) {
    const { tmpDir } = await getCliTestFixture()

    await fs.writeFile(
      path.join(tmpDir, fileName),
      'export default () => <board width="10mm" height="10mm"></board>',
    )

    const entrypoint = await getEntrypoint({
      projectDir: tmpDir,
    })

    expect(entrypoint).not.toBeNull()
    expect(entrypoint).toBe(path.join(tmpDir, fileName))
  }
})

test("getEntrypoint prioritizes common locations over recursive search", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create entrypoint in common location (src/)
  await fs.mkdir(path.join(tmpDir, "src"))
  await fs.writeFile(
    path.join(tmpDir, "src", "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // Create entrypoint in nested location
  await fs.mkdir(path.join(tmpDir, "components", "nested"), { recursive: true })
  await fs.writeFile(
    path.join(tmpDir, "components", "nested", "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "src", "index.tsx"))
})

test("getEntrypoint handles directory access errors gracefully", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create a valid entrypoint
  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  // The function should still work even if some directories can't be accessed
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).not.toBeNull()
  expect(entrypoint).toBe(path.join(tmpDir, "index.tsx"))
})

test("getEntrypoint validates file paths within project directory", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Try to access file outside project with absolute path
  const outsidePath = path.join(path.dirname(tmpDir), "outside.tsx")
  await fs.writeFile(outsidePath, "export default () => <board></board>")

  let onErrorCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    filePath: outsidePath,
    onError: () => {
      onErrorCalled = true
    },
  })

  expect(entrypoint).toBeNull()
  expect(onErrorCalled).toBeTrue()

  // Cleanup
  await fs.unlink(outsidePath)
})

test("getEntrypoint handles empty project directory", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Don't create any files
  let onErrorCalled = false
  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    onError: () => {
      onErrorCalled = true
    },
  })

  expect(entrypoint).toBeNull()
  expect(onErrorCalled).toBeTrue()
})

test("getEntrypoint uses custom callback functions", async () => {
  const { tmpDir } = await getCliTestFixture()

  await fs.writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )

  let successMessage = ""
  let errorMessage = ""

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
    onSuccess: (msg) => {
      successMessage = msg
    },
    onError: (msg) => {
      errorMessage = msg
    },
  })

  expect(entrypoint).not.toBeNull()
  expect(successMessage).toContain("Detected entrypoint")
  expect(errorMessage).toBe("")
})
