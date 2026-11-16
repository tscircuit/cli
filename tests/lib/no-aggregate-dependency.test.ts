import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

// Rollout gate: update the converter/solver releases and regenerate bun.lock
// after their required aggregate peers have been removed upstream.
test("CLI's resolved graph does not reinstall tscircuit through transitive peers", () => {
  const lock = readFileSync(new URL("../../bun.lock", import.meta.url), "utf8")
  expect(lock).not.toMatch(/"(?:[^"]*\/)?tscircuit":\s*\["tscircuit@/)
})
