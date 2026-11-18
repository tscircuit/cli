import { expect, test } from "bun:test"
import * as circuitJson from "circuit-json"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

test("the simulation entry point bundles without superseded IBIS record schemas", async () => {
  const removedSchemas = new Set([
    "simulation_ibis_pin_state",
    "simulation_digital_stimulus",
  ])
  const currentExports = Object.keys(circuitJson).filter(
    (name) => !removedSchemas.has(name),
  )
  const result = await Bun.build({
    entrypoints: [
      resolve(
        import.meta.dir,
        "../../../cli/simulate/run-pcb-spice-simulation.ts",
      ),
    ],
    target: "bun",
    plugins: [
      {
        name: "current-circuit-json-schemas",
        setup(build) {
          build.onResolve({ filter: /^circuit-json$/ }, () => ({
            path: "current-schemas",
            namespace: "circuit-json-schemas",
          }))
          build.onLoad(
            { filter: /.*/, namespace: "circuit-json-schemas" },
            () => ({
              contents: `export { ${currentExports.join(", ")} } from ${JSON.stringify(fileURLToPath(import.meta.resolve("circuit-json")))}`,
              loader: "js",
            }),
          )
        },
      },
    ],
  })
  expect(result.success).toBe(true)
})
