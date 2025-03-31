import { test, expect, beforeEach, afterEach } from "bun:test"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should fail if no entrypoint file is found", async () => {
  const { runCommand } = await getCliTestFixture()
  try {
    await runCommand("tsci push")
  } catch (e) {
    if (e instanceof Error) {
      expect(e.message).toContain(
        "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
      )
    } else {
      throw e
    }
  }
})

test("should use default entrypoint if no file is provided", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const defaultEntrypoint = path.resolve(tmpDir, "index.tsx")
  fs.writeFileSync(defaultEntrypoint, "// Default entrypoint!")
  const { stdout, stderr } = await runCommand(`tsci push`)
  expect({ stdout, stderr }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "No package.json found, try running 'tsci init' to bootstrap the project
    "
    ,
      "stdout": 
    "Detected entrypoint: 'index.tsx'
    Updated tscircuit.config.json with detected entrypoint
    "
    ,
    }
  `)
})

test.skip("should fail if package.json is missing or invalid", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

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
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout } = await runCommand(`tsci push ${snippetFilePath}`)
  expect(stdout).toContain("Successfully pushed package")
})

test("should bump version if release already exists", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const packageJsonPath = path.resolve(tmpDir, "package.json")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout: stdout1, stderr: stderr1 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout1, stderr: stderr1 }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "Package author does not match the logged in GitHub username
    "
    ,
      "stdout": 
    "Package created


    Uploaded file package.json to the registry.
    Uploaded file snippet.tsx to the registry.
    Successfully pushed package "@tsci/test-user.test-package@1.0.0"! https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)

  const { stdout: stdout2, stderr: stderr2 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout2, stderr: stderr2 }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "Package author does not match the logged in GitHub username
    "
    ,
      "stdout": 
    "Incrementing Package Version 1.0.0 -> 1.0.1


    Uploaded file package.json to the registry.
    Uploaded file snippet.tsx to the registry.
    Successfully pushed package "@tsci/test-user.test-package@1.0.1"! https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)
})

test("should upload files to the registry", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)
  expect({ stdout, stderr }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "Package author does not match the logged in GitHub username
    "
    ,
      "stdout": 
    "Package created


    Uploaded file package.json to the registry.
    Uploaded file snippet.tsx to the registry.
    Successfully pushed package "@tsci/test-user.test-package@1.0.0"! https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)
})
