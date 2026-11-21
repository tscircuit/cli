import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should NOT upload dist directory by default", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  fs.mkdirSync(path.resolve(tmpDir, "dist"))
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.js"), "// Built content")
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.d.ts"), "// Type defs")

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  const uploadedPaths = registryDb.packageFiles.map((file) => file.file_path)
  expect(uploadedPaths).not.toContain("dist/index.js")
  expect(uploadedPaths).not.toContain("dist/index.d.ts")
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)

test("should upload dist directory when --include-dist flag is passed", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  fs.mkdirSync(path.resolve(tmpDir, "dist"))
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.js"), "// Built content")
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.d.ts"), "// Type defs")

  const { stdout, stderr } = await runCommand(
    `tsci push ${snippetFilePath} --include-dist`,
  )

  const uploadedPaths = registryDb.packageFiles.map((file) => file.file_path)
  expect(uploadedPaths).toContain("dist/index.js")
  expect(uploadedPaths).toContain("dist/index.d.ts")
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)

test("should use the uploaded dist as the build instead of a cloud build with --include-dist", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  fs.mkdirSync(path.resolve(tmpDir, "dist"))
  fs.writeFileSync(path.resolve(tmpDir, "dist/circuit.json"), "[]")

  const { stdout, stderr } = await runCommand(
    `tsci push ${snippetFilePath} --include-dist`,
  )

  expect(stderr).toBe("")
  expect(stdout).toContain("skipping cloud build")
  expect(stdout).toContain("published!")

  // A cloud build would discard the uploaded circuit json and rebuild it
  const uploadedPaths = registryDb.packageFiles.map((file) => file.file_path)
  expect(uploadedPaths).toContain("dist/circuit.json")

  const release = registryDb.packageReleases.find(
    (release) => release.version === "1.0.0",
  )!
  const builds = registryDb.getPackageBuildsByReleaseId(
    release.package_release_id,
  )
  expect(builds).toHaveLength(1)
  expect(builds[0].build_source).toBe("local")
}, 30_000)

test("should build in the cloud when --include-dist is passed without a dist directory", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(
    `tsci push ${snippetFilePath} --include-dist`,
  )

  expect(stderr).toContain("no dist files were found")
  expect(stdout).not.toContain("skipping cloud build")
  expect(stdout).toContain("published!")

  const release = registryDb.packageReleases.find(
    (release) => release.version === "1.0.0",
  )!
  expect(release.ready_to_build).toBe(true)
  expect(
    registryDb.getPackageBuildsByReleaseId(release.package_release_id),
  ).toHaveLength(0)
}, 30_000)
