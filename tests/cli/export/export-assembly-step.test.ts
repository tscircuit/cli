import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const assemblyCode = `
import { assembly, jscad } from "tscircuit"

export default () => (
  <assembly.device>
    <assembly.printedpart
      name="SPACER"
      jscad={
        <jscad.subtract>
          <jscad.cuboid size={[12, 10, 4]} />
          <jscad.cylinder radius={1} height={6} />
        </jscad.subtract>
      }
    />
  </assembly.device>
)
`

test("assembly STEP exports a printable part without a PCB", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "spacer.circuit.tsx")
  await mkdir(path.join(tmpDir, "node_modules"))
  for (const dependency of ["react", "tscircuit"]) {
    await symlink(
      path.resolve(import.meta.dir, "../../../node_modules", dependency),
      path.join(tmpDir, "node_modules", dependency),
      "dir",
    )
  }
  await writeFile(circuitPath, assemblyCode)

  const { exitCode, stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} --format assembly-step`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const outputPath = path.join(tmpDir, "spacer.circuit-assembly.step")
  const step = await readFile(outputPath, "utf8")
  expect(stdout).toContain(`Exported to ${outputPath}!`)
  expect(step).toStartWith("ISO-10303-21;")
  expect(step).toContain("MANIFOLD_SOLID_BREP")
  expect(step).toContain("CLOSED_SHELL")
  expect(step).toContain("SI_UNIT(.MILLI.,.METRE.)")
  expect(step.trimEnd()).toEndWith("END-ISO-10303-21;")
}, 30_000)

test("assembly STEP exports Circuit JSON with a custom output path and placement", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "parts.circuit.json")
  const circuitJson: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "printed",
      ftype: "printedpart",
      name: "SPACER",
    },
    {
      type: "cad_component",
      cad_component_id: "printed_cad",
      source_component_id: "printed",
      position: { x: 20, y: 30, z: 40 },
      rotation: { x: 0, y: 0, z: 90 },
      model_origin_position: { x: 1, y: 0, z: 0 },
      model_unit_to_mm_scale_factor: 2,
      model_jscad: { type: "cuboid", size: [4, 6, 2] },
      model_object_fit: "contain_within_bounds",
      anchor_alignment: "center",
    },
    {
      type: "source_component",
      source_component_id: "motor",
      ftype: "motor",
      name: "MOTOR",
    },
    {
      type: "cad_component",
      cad_component_id: "motor_cad",
      source_component_id: "motor",
      position: { x: 1000, y: 1000, z: 1000 },
      model_jscad: { type: "cuboid", size: [100, 100, 100] },
      model_object_fit: "contain_within_bounds",
      anchor_alignment: "center",
    },
  ]
  await writeFile(circuitPath, JSON.stringify(circuitJson))

  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} -f assembly-step -o spacer.step`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const step = await readFile(path.join(tmpDir, "spacer.step"), "utf8")
  const points = new Map(
    [...step.matchAll(/#(\d+) = CARTESIAN_POINT\('[^']*',\(([^)]+)\)\);/g)].map(
      (match) => [match[1], match[2].split(",").map(Number)],
    ),
  )
  const vertices = [...step.matchAll(/VERTEX_POINT\('[^']*',#(\d+)\)/g)].map(
    (match) => points.get(match[1])!,
  )
  expect(vertices.length).toBeGreaterThan(0)
  for (const [axis, min, max] of [
    [0, 14, 26],
    [1, 24, 32],
    [2, 38, 42],
  ]) {
    expect(Math.min(...vertices.map((point) => point[axis]))).toBeCloseTo(min)
    expect(Math.max(...vertices.map((point) => point[axis]))).toBeCloseTo(max)
  }
}, 30_000)

test("assembly STEP reports missing printable geometry without creating an output", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "missing.circuit.json")
  await writeFile(
    circuitPath,
    JSON.stringify([
      {
        type: "source_component",
        source_component_id: "printed",
        ftype: "printedpart",
        name: "MISSING",
      },
    ]),
  )

  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} -f assembly-step`,
  )
  expect(exitCode).toBe(1)
  expect(stderr).toContain('Printed part "MISSING" needs JSCAD geometry')
  expect(
    await Bun.file(path.join(tmpDir, "missing.circuit-assembly.step")).exists(),
  ).toBe(false)
}, 30_000)
