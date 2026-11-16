import { expect, test } from "bun:test"
import manifest from "../../package.json"
// Core does not expose its package.json to TypeScript.
// @ts-ignore
import core from "@tscircuit/core/package.json"
import { getTscircuitDependencyVersion } from "../../lib/shared/get-tscircuit-dependency-version"

test("CLI owns core and runtime dependencies without an aggregate package cycle", () => {
  expect(manifest.dependencies["@tscircuit/core"]).toBe(core.version)
  expect(manifest.tscircuitDependencySync.version).toBe(1)
  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ] as const) {
    expect(manifest[section as keyof typeof manifest] ?? {}).not.toHaveProperty(
      "tscircuit",
    )
  }
  expect(getTscircuitDependencyVersion("@tscircuit/core")).toBe(core.version)
  expect(manifest.dependencies).toHaveProperty("@tscircuit/capacity-autorouter")
  expect(manifest.dependencies).toHaveProperty("@tscircuit/props")
})
