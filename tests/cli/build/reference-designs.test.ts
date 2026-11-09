import { test, expect } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { buildReferenceDesigns } from "cli/build/reference-designs/build-reference-designs"

test("all declared configurations produce matching prebuilt artifacts and normalized props", async () => {
  const projectDir = await fs.mkdtemp(
    path.join(import.meta.dir, "reference-design-"),
  )
  globalThis.deferredCleanupFns.push(() =>
    fs.rm(projectDir, { recursive: true, force: true }),
  )
  await fs.copyFile(
    path.resolve(
      import.meta.dir,
      "../../../examples/reference-designs/ne555-timer/index.circuit.tsx",
    ),
    path.join(projectDir, "index.circuit.tsx"),
  )
  const manifest = await buildReferenceDesigns({
    projectDir,
    platformConfig: { autorouterThreads: 1 },
    definitions: [
      {
        name: "timer",
        displayName: "NE555 timer",
        componentPath: "index.circuit.tsx",
        chipNames: ["NE555DR"],
      },
    ],
  })
  const design = manifest.reference_designs[0]
  expect(
    design.configurations.map((configuration) => configuration.name),
  ).toEqual(["full_board", "slow", "without_led"])
  expect(design.configurations[0].props).toEqual({
    timingCapacitance: "10uF",
    omitLed: false,
  })
  for (const configuration of design.configurations) {
    for (const filePath of [
      configuration.circuit_json_path,
      configuration.glb_path,
      configuration.pcb_svg_path,
      configuration.schematic_svg_path,
    ])
      expect(
        (await fs.stat(path.join(projectDir, filePath))).size,
      ).toBeGreaterThan(0)
    const circuitBytes = await fs.readFile(
      path.join(projectDir, configuration.circuit_json_path),
    )
    expect(createHash("sha256").update(circuitBytes).digest("hex")).toBe(
      configuration.circuit_json_sha256,
    )
    const circuit = JSON.parse(circuitBytes.toString()) as Array<{
      type: string
      name?: string
      capacitance?: number
    }>
    expect(
      circuit.some(
        (element) =>
          element.type === "source_component" && element.name === "D1",
      ),
    ).toBe(configuration.name !== "without_led")
  }
  expect(
    JSON.parse(
      await fs.readFile(
        path.join(projectDir, "dist/reference-designs.json"),
        "utf8",
      ),
    ),
  ).toEqual(manifest)
}, 120000)
