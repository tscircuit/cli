import { expect, test } from "bun:test"
import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { buildDrawings } from "cli/build/build-drawings"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build drawings use per-circuit directories and select pages by filename", async () => {
  const { tmpDir } = await getCliTestFixture()
  const circuitDir = path.join(tmpDir, "dist/carrier")
  await mkdir(circuitDir, { recursive: true })
  const outputPath = path.join(circuitDir, "circuit.json")
  await copyFile(
    path.join(import.meta.dir, "../../fixtures/drawings/carrier.circuit.json"),
    outputPath,
  )
  const builtFiles = [
    { sourcePath: "carrier.circuit.tsx", outputPath, ok: true },
  ]
  await buildDrawings({ builtFiles })
  expect((await readdir(path.join(circuitDir, "drawings"))).sort()).toEqual([
    "carrier-plan.svg",
    "carrier-side.svg",
  ])
  expect(
    await readFile(path.join(circuitDir, "drawings/carrier-plan.svg"), "utf8"),
  ).toContain("<svg")
  await rm(path.join(circuitDir, "drawings"), { recursive: true })
  await buildDrawings({ builtFiles, drawing: "carrier-side.svg" })
  expect(await readdir(path.join(circuitDir, "drawings"))).toEqual([
    "carrier-side.svg",
  ])
  await expect(
    buildDrawings({ builtFiles, drawing: "missing" }),
  ).rejects.toThrow("not found")
}, 60_000)
