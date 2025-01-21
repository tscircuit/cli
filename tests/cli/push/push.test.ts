import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test.skip("push command bundles and uploads to registry", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create package files
  await Bun.write(join(tmpDir, "package.json"), JSON.stringify({
    name: "@tsci/test-component",
    version: "0.1.0",
    main: "dist/index.js",
    module: "dist/index.mjs",
    types: "dist/index.d.ts"
  }))

  await Bun.write(join(tmpDir, "circuit.tsx"), `
    export const Circuit = () => (
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="10k" footprint="0402" />
      </board>
    )
  `)

  // Run push command
  const { stdout } = await runCommand("tsci push")
  
  // Verify bundle files were generated
  const distFiles = {
    esm: await Bun.file(join(tmpDir, "dist/index.mjs")).exists(),
    cjs: await Bun.file(join(tmpDir, "dist/index.js")).exists(),
    dts: await Bun.file(join(tmpDir, "dist/index.d.ts")).exists(),
    circuitJson: await Bun.file(join(tmpDir, "dist/circuit.json")).exists()
  }

  expect(distFiles.esm).toBe(true)
  expect(distFiles.cjs).toBe(true)
  expect(distFiles.dts).toBe(true)
  expect(distFiles.circuitJson).toBe(true)

  // Verify bundle contents
  const esmContent = await Bun.file(join(tmpDir, "dist/index.mjs")).text()
  expect(esmContent).toContain("export const Circuit")

  const cjsContent = await Bun.file(join(tmpDir, "dist/index.js")).text()
  expect(cjsContent).toContain("exports.Circuit")

  const dtsContent = await Bun.file(join(tmpDir, "dist/index.d.ts")).text()
  expect(dtsContent).toContain("export declare const Circuit")

  // Verify circuit JSON was generated correctly
  const circuitJson = JSON.parse(await Bun.file(join(tmpDir, "dist/circuit.json")).text())
  expect(circuitJson).toMatchObject({
    components: expect.arrayContaining([
      expect.objectContaining({
        type: "source_component",
        name: "R1",
        resistance: 10000,
      })
    ])
  })

  // Verify command output
  expect(stdout).toContain("Successfully pushed to registry")
  expect(stdout).toContain("Generated Circuit JSON")
  expect(stdout).toContain("ESM bundle size:")
  expect(stdout).toContain("CJS bundle size:")
})

test.skip("push command with force flag bypasses bundle validation", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create invalid package
  await Bun.write(join(tmpDir, "package.json"), JSON.stringify({
    name: "@tsci/test-component",
    version: "0.1.0"
  }))

  await Bun.write(join(tmpDir, "circuit.tsx"), `
    export const Circuit = () => (
      // Invalid JSX
      <board>
        <broken-component />
    )
  `)

  // Push should succeed with -f flag despite invalid code
  const { stdout } = await runCommand("tsci push -f")
  expect(stdout).toContain("Forced push successful")
  expect(stdout).toContain("Warning: Bundle validation skipped")
})

test.skip("push command fails on invalid typescript", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "package.json"), JSON.stringify({
    name: "@tsci/test-component",
    version: "0.1.0"
  }))

  await Bun.write(join(tmpDir, "circuit.tsx"), `
    export const Circuit = () => {
      const x: number = "string" // Type error
      return <board />
    }
  `)

  // Push should fail due to TypeScript error
  await expect(runCommand("tsci push")).rejects.toThrow()
})