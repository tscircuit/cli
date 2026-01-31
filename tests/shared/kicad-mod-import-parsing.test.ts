import { test, expect, beforeAll } from "bun:test"
import { plugin } from "bun"
import path from "node:path"

// Register the static asset loaders before running tests
beforeAll(async () => {
  const { registerStaticAssetLoaders } = await import(
    "lib/shared/register-static-asset-loaders"
  )
  registerStaticAssetLoaders()
})

test("should load .kicad_mod file and export circuit JSON array", async () => {
  const fixturePath = path.resolve(
    import.meta.dir,
    "../fixtures/test-resistor.kicad_mod",
  )
  const mod = await import(fixturePath)

  // Should be an array of circuit elements
  expect(Array.isArray(mod.default)).toBe(true)
  expect(mod.default.length).toBeGreaterThan(0)
})

test("exported circuit JSON should contain pcb_smtpad elements", async () => {
  const fixturePath = path.resolve(
    import.meta.dir,
    "../fixtures/test-resistor.kicad_mod",
  )
  const mod = await import(fixturePath)
  const circuitJson = mod.default

  // Should contain smtpad elements from the R_0402 resistor footprint
  const smtpads = circuitJson.filter(
    (el: { type: string }) => el.type === "pcb_smtpad",
  )
  expect(smtpads.length).toBeGreaterThan(0)
})

test("exported circuit JSON should have valid structure", async () => {
  const fixturePath = path.resolve(
    import.meta.dir,
    "../fixtures/test-resistor.kicad_mod",
  )
  const mod = await import(fixturePath)
  const circuitJson = mod.default

  // Each element should have a type property
  for (const element of circuitJson) {
    expect(element).toHaveProperty("type")
  }
})

test("can use footprint directly (array of circuit elements)", async () => {
  const fixturePath = path.resolve(
    import.meta.dir,
    "../fixtures/test-resistor.kicad_mod",
  )
  const mod = await import(fixturePath)
  const footprint = mod.default

  // The footprint should be usable as-is (array of circuit elements)
  // This simulates how it would be used: <chip footprint={footprint} />
  expect(footprint).toBeDefined()
  expect(Array.isArray(footprint)).toBe(true)
})
