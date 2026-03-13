import { afterEach, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import {
  getCurrentDirectoryPackageName,
  getPublicDistEnabledFromOptions,
} from "cli/registry/packages/update/register"

const originalCwd = process.cwd()

afterEach(() => {
  process.chdir(originalCwd)
})

test("public dist flags map to public_dist_enabled payload values", () => {
  expect(getPublicDistEnabledFromOptions({ enablePublicDist: true })).toBe(true)
  expect(getPublicDistEnabledFromOptions({ disablePublicDist: true })).toBe(
    false,
  )
  expect(getPublicDistEnabledFromOptions({})).toBeUndefined()
})

test("getCurrentDirectoryPackageName reads package name from package.json", () => {
  const tmpDir = temporaryDirectory()
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.board" }),
  )

  process.chdir(tmpDir)

  expect(getCurrentDirectoryPackageName()).toBe("@tsci/test-user.board")
})

test("getCurrentDirectoryPackageName returns undefined when package.json is missing or invalid", () => {
  const tmpDir = temporaryDirectory()

  process.chdir(tmpDir)
  expect(getCurrentDirectoryPackageName()).toBeUndefined()

  fs.writeFileSync(path.join(tmpDir, "package.json"), "{not-valid-json")
  expect(getCurrentDirectoryPackageName()).toBeUndefined()
})
