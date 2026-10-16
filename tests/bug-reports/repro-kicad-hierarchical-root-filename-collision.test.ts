import { expect, test } from "bun:test"
import { copyFile, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

test("kicad_zip keeps the root when a child sheet has the project name", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await copyFile(
    path.join(
      import.meta.dir,
      "../fixtures/assets/kicad-hierarchical-root-filename-collision/index.tsx",
    ),
    path.join(tmpDir, "index.tsx"),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const result = await runCommand("tsci export index.tsx -f kicad_zip")
  expect(result.exitCode).toBe(0)

  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "index-kicad.zip")),
  )
  const rootFile = zip.file("index.kicad_sch")
  const childFile = zip.file("index_2.kicad_sch")
  expect(rootFile).not.toBeNull()
  expect(childFile).not.toBeNull()

  const rootSchematic = await rootFile!.async("string")
  const childSchematic = await childFile!.async("string")

  expect(rootSchematic).toContain("index_2.kicad_sch")
  expect(rootSchematic).not.toContain('(property "Reference" "R1"')
  expect(childSchematic).toContain('(property "Reference" "R1"')
}, 60_000)
