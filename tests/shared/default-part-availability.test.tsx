import { expect, test } from "bun:test"
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { getPlatformConfig } from "@tscircuit/eval/platform-config"
import type { PlatformConfig } from "@tscircuit/props"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"

test("CLI enables availability with a capable engine while browser defaults stay opt-in", () => {
  const cliPlatform = getPlatformConfigWithCliDefaults()
  expect(cliPlatform.checkAvailability).toBe(true)
  expect(typeof cliPlatform.partsEngine?.fetchPartAvailability).toBe("function")
  expect(getPlatformConfig().checkAvailability).not.toBe(true)

  const customEngine = { findPart: async () => ({}) }
  const overridden = getPlatformConfigWithCliDefaults({
    checkAvailability: false,
    partsEngine: customEngine,
  })
  expect(overridden.checkAvailability).toBe(false)
  expect(overridden.partsEngine).toBe(customEngine)
  expect(
    getPlatformConfigWithCliDefaults({ pcbDisabled: true }).checkAvailability,
  ).toBe(true)
})

test("CLI rendering checks stock through the default engine and supports explicit opt-out", async () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "cli-availability-"))
  symlinkSync(
    path.resolve("node_modules"),
    path.join(projectDir, "node_modules"),
    "junction",
  )
  const filePath = path.join(projectDir, "index.circuit.tsx")
  writeFileSync(
    filePath,
    `export default () => (
      <board routingDisabled>
        <resistor name="R1" resistance="10k" footprint="0402"
          supplierPartNumbers={{ jlcpcb: ["C1525"] }} />
      </board>
    )`,
  )
  try {
    for (const scenario of [
      { stock: 0, enabled: true, warningCount: 1 },
      { stock: 10, enabled: true, warningCount: 0 },
      { stock: 0, enabled: false, warningCount: 0 },
    ]) {
      const availabilityRequests: string[] = []
      const platformFetch: NonNullable<PlatformConfig["platformFetch"]> =
        Object.assign(
          async (input: Parameters<typeof fetch>[0]) => {
            const url = String(input)
            if (url.startsWith("https://jlcsearch.tscircuit.com/api/search?")) {
              availabilityRequests.push(url)
              expect(new URL(url).searchParams.get("q")).toBe("C1525")
              return Response.json({
                components: [
                  { lcsc: 1525, stock: scenario.stock, price: 0.001 },
                ],
              })
            }
            throw new Error(`Unexpected request: ${url}`)
          },
          { preconnect: () => {} },
        )
      const platformConfig = getPlatformConfigWithCliDefaults(
        {
          pcbDisabled: true,
          platformFetch,
          ...(!scenario.enabled ? { checkAvailability: false } : {}),
        },
        { projectDir },
      )
      const { circuitJson } = await generateCircuitJson({
        filePath,
        projectDir,
        platformConfig,
      })
      const warnings = circuitJson.filter(
        (element) => element.type === "source_component_availability_warning",
      )
      expect(warnings).toHaveLength(scenario.warningCount)
      expect(availabilityRequests).toHaveLength(scenario.enabled ? 1 : 0)
      if (warnings.length) {
        expect(warnings[0].message).toContain("R1 may not have availability")
      }
    }
  } finally {
    rmSync(projectDir, { recursive: true, force: true })
  }
}, 20000)
