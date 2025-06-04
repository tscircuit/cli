import { expect, test } from "bun:test"
import { shouldIgnorePath } from "lib/shared/should-ignore-path"

test("ignores default directories", () => {
  expect(shouldIgnorePath("node_modules/foo.js")).toBe(true)
  expect(shouldIgnorePath(".git/config")).toBe(true)
  expect(shouldIgnorePath(".vscode/settings.json")).toBe(true)
})

test("ignores custom directories", () => {
  expect(shouldIgnorePath("build/output.js", ["build"])).toBe(true)
})

test("allows regular files", () => {
  expect(shouldIgnorePath("src/index.tsx")).toBe(false)
})
