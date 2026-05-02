import { expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("should fail if no package.json is found", async () => {
  const { runCommand } = await getCliTestFixture({ loggedIn: true })
  const { stderr, exitCode } = await runCommand("tsci push")

  expect(exitCode).toBe(1)
  expect(stderr).toBe(
    "No package.json found, try running 'tsci init' to bootstrap the project\n",
  )
})

test("should push a package without an entrypoint", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )
  fs.writeFileSync(
    path.resolve(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["**/*.circuit.json"] }),
  )
  fs.writeFileSync(
    path.resolve(tmpDir, "prebuilt.circuit.json"),
    JSON.stringify([{ type: "source_component", name: "U1" }]),
  )

  const { stdout, stderr, exitCode } = await runCommand("tsci push")

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ prebuilt.circuit.json")
  expect(stdout).toContain("⬆︎ tscircuit.config.json")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)

test("should push a package by falling back to a selectable file when no entrypoint is found", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )
  fs.writeFileSync(
    path.resolve(tmpDir, "board.tsx"),
    "export const Board = () => null\n",
  )

  const { stdout, stderr, exitCode } = await runCommand("tsci push")

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("⬆︎ board.tsx")
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
  expect(stdout).not.toContain("No entrypoint found")
}, 30_000)
