import { afterEach, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { resolveKicadLibraryName } from "lib/utils/resolve-kicad-library-name"

const projectDirs: string[] = []

afterEach(() => {
  for (const projectDir of projectDirs.splice(0)) {
    rmSync(projectDir, { recursive: true, force: true })
  }
})

const createProject = (name: string, kicadLibraryName?: string) => {
  const projectDir = mkdtempSync(path.join(os.tmpdir(), "tsci-library-name-"))
  projectDirs.push(projectDir)
  writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({ name }))
  if (kicadLibraryName) {
    writeFileSync(
      path.join(projectDir, "tscircuit.config.json"),
      JSON.stringify({ kicadLibraryName }),
    )
  }
  return projectDir
}

for (const name of [
  "usb.connector",
  "alice/usb.connector",
  "@acme/usb.connector",
  "@acme.tools/usb.connector",
  "@tsci/alice.usb.connector",
]) {
  test(`derives the full KiCad library name from ${name}`, () => {
    const projectDir = createProject(name)
    expect(resolveKicadLibraryName({ projectDir })).toBe("usb-connector")
  })
}

test("distinct scoped dotted packages retain distinct KiCad library names", () => {
  const names = ["@acme/usb.connector", "@acme/power.connector"].map((name) =>
    resolveKicadLibraryName({ projectDir: createProject(name) }),
  )
  expect(names).toEqual(["usb-connector", "power-connector"])
})

test("explicit KiCad library name takes precedence over a scoped dotted package", () => {
  const projectDir = createProject("@acme/usb.connector", "custom-library")
  expect(resolveKicadLibraryName({ projectDir })).toBe("custom-library")
})
