import { test, expect, beforeEach, afterEach } from "bun:test"
import { getTestSnippetsServer } from "./fixtures/get-test-server"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

const { ky } = await getTestSnippetsServer()
const { tmpDir, runCommand } = await getCliTestFixture()

beforeEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  fs.mkdirSync(tmpDir, { recursive: true })
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-package",
      version: "1.0.0",
    }),
  )
})
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

test("should fail if no entrypoint file is found", async () => {
  await runCommand("tsci push").catch((e) => {
    expect(e.message).toInclude(
      "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
    )
  })
})

test("should use default entrypoint if no file is provided", async () => {
  const defaultEntrypoint = path.resolve(tmpDir, "index.tsx")
  fs.writeFileSync(defaultEntrypoint, "// Default entrypoint!")
  const { stdout } = await runCommand(`tsci push`)
  expect(stdout).toContain(
    "No file provided. Using 'index.tsx' as the entrypoint.",
  )
})

test("should fail if package.json is missing or invalid", async () => {
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  fs.writeFileSync(snippetFilePath, "// Snippet content")

  try {
    await runCommand(`tsci push ${snippetFilePath}`)
  } catch (error) {
    expect(console.error).toHaveBeenCalledWith(
      "Failed to retrieve package version.",
    )
  }
})

test("should create package if it does not exist", async () => {
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")

  const { stdout } = await runCommand(`tsci push ${snippetFilePath}`)
  expect(stdout).toContain("Successfully pushed package")
})

test("should bump version if release already exists", async () => {
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const packageJsonPath = path.resolve(tmpDir, "package.json")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout } = await runCommand(`tsci push ${snippetFilePath}`)
  expect(stdout).toContain("Incrementing Package Version 1.0.0 -> 1.0.1")
})

test("should upload files to the registry", async () => {
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")

  const { stdout } = await runCommand(`tsci push ${snippetFilePath}`)
  expect(stdout).toContain("Uploaded file snippet.tsx to the registry.")
})
