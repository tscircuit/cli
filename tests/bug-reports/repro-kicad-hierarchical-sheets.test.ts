import { expect, test } from "bun:test"
import { copyFile, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

const childSchematicFiles = ["power.kicad_sch", "control.kicad_sch"]

function expectSheetComponent({
  schematic,
  expectedReference,
  excludedReference,
}: {
  schematic: string
  expectedReference: string
  excludedReference: string
}) {
  expect(schematic).toContain(`(property "Reference" "${expectedReference}"`)
  expect(schematic).not.toContain(
    `(property "Reference" "${excludedReference}"`,
  )
}

async function createReproduction() {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await copyFile(
    path.join(
      import.meta.dir,
      "../fixtures/assets/kicad-hierarchical-sheets/index.tsx",
    ),
    path.join(tmpDir, "index.tsx"),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  return { tmpDir, runCommand }
}

test("kicad_zip includes every hierarchical child schematic", async () => {
  const { tmpDir, runCommand } = await createReproduction()
  const result = await runCommand("tsci export index.tsx -f kicad_zip")
  expect(result.exitCode).toBe(0)

  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "index-kicad.zip")),
  )
  const zipFiles = Object.keys(zip.files)
  const rootSchematic = await zip.file("index.kicad_sch")!.async("string")

  for (const childFile of childSchematicFiles) {
    expect(rootSchematic).toContain(childFile)
    expect(zipFiles).toContain(childFile)
  }

  const powerSchematic = await zip.file("power.kicad_sch")!.async("string")
  const controlSchematic = await zip.file("control.kicad_sch")!.async("string")
  expectSheetComponent({
    schematic: powerSchematic,
    expectedReference: "R1",
    excludedReference: "C1",
  })
  expectSheetComponent({
    schematic: controlSchematic,
    expectedReference: "C1",
    excludedReference: "R1",
  })
}, 60_000)

test("build --kicad-project writes every hierarchical child schematic", async () => {
  const { tmpDir, runCommand } = await createReproduction()
  const result = await runCommand("tsci build index.tsx --kicad-project")
  expect(result.exitCode).toBe(0)

  const projectDir = path.join(tmpDir, "dist", "index", "kicad")
  const projectFiles = await readdir(projectDir)
  const rootSchematic = await readFile(
    path.join(projectDir, "index.kicad_sch"),
    "utf8",
  )

  for (const childFile of childSchematicFiles) {
    expect(rootSchematic).toContain(childFile)
    expect(projectFiles).toContain(childFile)
  }

  const powerSchematic = await readFile(
    path.join(projectDir, "power.kicad_sch"),
    "utf8",
  )
  const controlSchematic = await readFile(
    path.join(projectDir, "control.kicad_sch"),
    "utf8",
  )
  expectSheetComponent({
    schematic: powerSchematic,
    expectedReference: "R1",
    excludedReference: "C1",
  })
  expectSheetComponent({
    schematic: controlSchematic,
    expectedReference: "C1",
    excludedReference: "R1",
  })
}, 60_000)

test("build --kicad-project-zip includes every hierarchical child schematic", async () => {
  const { tmpDir, runCommand } = await createReproduction()
  const result = await runCommand("tsci build index.tsx --kicad-project-zip")
  expect(result.exitCode).toBe(0)

  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "dist", "index", "index-kicad.zip")),
  )
  const zipFiles = Object.keys(zip.files)
  const rootSchematic = await zip.file("index.kicad_sch")!.async("string")

  for (const childFile of childSchematicFiles) {
    expect(rootSchematic).toContain(childFile)
    expect(zipFiles).toContain(childFile)
  }

  const powerSchematic = await zip.file("power.kicad_sch")!.async("string")
  const controlSchematic = await zip.file("control.kicad_sch")!.async("string")
  expectSheetComponent({
    schematic: powerSchematic,
    expectedReference: "R1",
    excludedReference: "C1",
  })
  expectSheetComponent({
    schematic: controlSchematic,
    expectedReference: "C1",
    excludedReference: "R1",
  })
}, 60_000)
