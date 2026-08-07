import { expect, test } from "bun:test"
import { resolveDevTarget } from "cli/dev/resolve-dev-target"
import fs from "node:fs"
import path from "node:path"
import { temporaryDirectory } from "tempy"

test("dev discovers circuit.json without an explicit target", async () => {
  const projectDir = temporaryDirectory()
  const circuitJsonPath = path.join(projectDir, "circuit.json")
  fs.writeFileSync(circuitJsonPath, "[]")

  const target = await resolveDevTarget(undefined, projectDir)

  expect(target).toEqual({
    absolutePath: circuitJsonPath,
    projectDir,
  })
})

test("dev accepts an explicit circuit.json file", async () => {
  const projectDir = temporaryDirectory()
  const circuitJsonPath = path.join(projectDir, "circuit.json")
  fs.writeFileSync(circuitJsonPath, "[]")

  const target = await resolveDevTarget("circuit.json", projectDir)

  expect(target).toEqual({
    absolutePath: circuitJsonPath,
    projectDir,
  })
})
