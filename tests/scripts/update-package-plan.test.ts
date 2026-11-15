import { expect, test } from "bun:test"
import { getPackageUpdatePlan } from "../../scripts/update-package-plan"

const manifest = {
  dependencies: {
    "@tscircuit/core": "1.0.0",
    "@tscircuit/eval": "1.0.0",
    "@tscircuit/runframe": "1.0.0",
  },
  devDependencies: { "circuit-json-to-kicad": "1.0.0" },
}
test("runframe events update runtime inputs and select core in a separate step", () => {
  expect(getPackageUpdatePlan(manifest, "@tscircuit/runframe")).toEqual([
    "@tscircuit/runframe",
    "@tscircuit/eval",
  ])
  expect(
    getPackageUpdatePlan(
      manifest,
      " @tscircuit/core, circuit-json-to-kicad,@tscircuit/runframe ",
    ),
  ).toEqual(["@tscircuit/runframe", "@tscircuit/eval", "circuit-json-to-kicad"])
  expect(() => getPackageUpdatePlan(manifest, "tscircuit")).toThrow(
    "does not own",
  )
  expect(() => getPackageUpdatePlan(manifest, "--ignore-scripts")).toThrow(
    "does not own",
  )
})
