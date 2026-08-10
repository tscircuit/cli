import { expect, test } from "bun:test"
import { getPackageManager } from "../../lib/shared/get-package-manager"

test("get-package-manager command injection prevention", () => {
  const pm = getPackageManager()

  expect(() => pm.install({ name: "x; ls", cwd: "." })).toThrow()
  expect(() => pm.install({ name: "pkg|curl", cwd: "." })).toThrow()
  expect(() => pm.install({ name: "pkg>file", cwd: "." })).toThrow()
  expect(() => pm.install({ name: "../pkg", cwd: "." })).toThrow()
  expect(() => pm.install({ name: "$(whoami)", cwd: "." })).toThrow()
})
