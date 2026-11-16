import { expect, test } from "bun:test"
import { copyCoreVersions } from "../../scripts/copy-core-versions"

test("core sync copies owned runtime and converter specs without adding core tools", () => {
  const current = {
    dependencies: { "@tscircuit/core": "1.0.0", "circuit-json": "old" },
    devDependencies: { "circuit-json-to-kicad": "old", typescript: "5.9" },
  }
  const core = {
    devDependencies: {
      "circuit-json": "^2.0.0",
      "circuit-json-to-kicad": "github:tscircuit/converter#abc",
      "unused-core-test-tool": "1.0.0",
    },
  }
  const result = copyCoreVersions(current, core)
  expect(result).toEqual({
    dependencies: { "@tscircuit/core": "1.0.0", "circuit-json": "^2.0.0" },
    devDependencies: {
      "circuit-json-to-kicad": "github:tscircuit/converter#abc",
      typescript: "5.9",
    },
  })
  expect(current.devDependencies["circuit-json-to-kicad"]).toBe("old")
  expect(copyCoreVersions(result, core)).toEqual(result)
})
