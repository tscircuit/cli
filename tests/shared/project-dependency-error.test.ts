import { expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { rethrowWithProjectSetupHint } from "lib/shared/rethrow-with-project-setup-hint"

for (const original of [
  new Error(
    "Cannot find package 'my-component' imported from /project/board.tsx",
  ),
  new Error(
    "Cannot find module 'react/invalid-subpath' from /project/board.tsx",
  ),
  new SyntaxError("Unexpected token in circuit source"),
  new TypeError("Component render failed"),
]) {
  test(`does not replace an unrelated error: ${original.message}`, () => {
    try {
      rethrowWithProjectSetupHint(original, os.tmpdir())
    } catch (error) {
      expect(error).toBe(original)
      return
    }
    throw new Error("Expected the original error to be rethrown")
  })
}

test("a nested entry points to its existing project and preserves the cause", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "tsci-parent-project-"),
  )
  try {
    const nested = path.join(directory, "circuits")
    await mkdir(nested)
    await writeFile(
      path.join(directory, "package.json"),
      '{"name":"my-project"}',
    )
    const original = new Error(
      "Cannot find module 'react/jsx-runtime' from circuit.tsx",
    )
    try {
      rethrowWithProjectSetupHint(original, nested)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).cause).toBe(original)
      expect((error as Error).message).toContain(
        `"tsci install" in ${directory}`,
      )
      expect((error as Error).message).not.toContain("tsci init")
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
