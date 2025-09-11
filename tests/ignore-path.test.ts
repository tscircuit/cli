import { expect, test } from "bun:test"
import { shouldIgnorePath } from "lib/shared/should-ignore-path"

test("ignores default directories", () => {
  expect(shouldIgnorePath("node_modules/foo.js")).toBe(true)
  expect(shouldIgnorePath(".git/config")).toBe(true)
  expect(shouldIgnorePath(".vscode/settings.json")).toBe(true)
  expect(shouldIgnorePath(".cache/file.txt")).toBe(true)
})

test("ignores custom patterns", () => {
  expect(shouldIgnorePath("build/output.js", ["build/**"])).toBe(true)
  expect(shouldIgnorePath("dist/app.js", ["**/dist/**"])).toBe(true)
})

test("allows regular files", () => {
  expect(shouldIgnorePath("src/index.tsx")).toBe(false)
})
