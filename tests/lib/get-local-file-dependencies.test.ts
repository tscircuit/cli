import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { getLocalFileDependencies } from "lib/dependency-analysis/getLocalFileDependencies"

test("getLocalFileDependencies resolves a directory import to its index file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "get-local-deps-"))
  try {
    mkdirSync(path.join(dir, "components"))
    writeFileSync(
      path.join(dir, "main.tsx"),
      'import { Foo } from "./components"\nimport { util } from "./util"\nexport default Foo\n',
    )
    writeFileSync(
      path.join(dir, "components", "index.tsx"),
      "export const Foo = () => null\n",
    )
    writeFileSync(path.join(dir, "util.ts"), "export const util = 1\n")

    const deps = getLocalFileDependencies(path.join(dir, "main.tsx"))

    expect(deps).toContain(path.join(dir, "components", "index.tsx"))
    expect(deps).not.toContain(path.join(dir, "components"))
    expect(deps).toContain(path.join(dir, "util.ts"))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
