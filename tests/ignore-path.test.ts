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

test("whitelists node_modules dist/index.js for hot-reloading linked packages", () => {
  // Top-level package dist/index.js should NOT be ignored
  expect(shouldIgnorePath("node_modules/my-package/dist/index.js")).toBe(false)
  // Scoped package dist/index.js should NOT be ignored
  expect(shouldIgnorePath("node_modules/@tscircuit/core/dist/index.js")).toBe(
    false,
  )
  // Other node_modules files should still be ignored
  expect(shouldIgnorePath("node_modules/my-package/src/index.ts")).toBe(true)
  expect(shouldIgnorePath("node_modules/my-package/dist/utils.js")).toBe(true)
  expect(shouldIgnorePath("node_modules/@tscircuit/core/package.json")).toBe(
    true,
  )
})
