import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import JSZip from "jszip"
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  Axis2Placement3D,
  ItemDefinedTransformation,
  VertexPoint,
  parseRepository,
} from "stepts"
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
  const outputPath = path.join(tmpDir, "spacer.circuit-assembly.zip")
  const zip = await JSZip.loadAsync(await readFile(outputPath))
  expect(Object.keys(zip.files)).toEqual(["SPACER.step"])
  const step = await zip.file("SPACER.step")!.async("string")
  expect(stdout).toContain(`Exported to ${outputPath}!`)
  expect(step).toStartWith("ISO-10303-21;")
  expect(step).toContain("MANIFOLD_SOLID_BREP")
  expect(step).toContain("CLOSED_SHELL")
  expect(step).toContain("SI_UNIT(.MILLI.,.METRE.)")
  expect(step).toContain("'SPACER'")
  expect(step).toContain("NEXT_ASSEMBLY_USAGE_OCCURRENCE")
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
    `tsci export ${circuitPath} -f assembly-step -o spacer.zip`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "spacer.zip")),
  )
  expect(Object.keys(zip.files)).toEqual(["SPACER.step"])
  const step = await zip.file("SPACER.step")!.async("string")
  const repo = parseRepository(step)
  const entities = repo.entries().map(([, entity]) => entity)
  const transform = entities.find(
    (entity) => entity instanceof ItemDefinedTransformation,
  )!
  const placement = transform.transformItem2.resolve(repo) as Axis2Placement3D
  const origin = placement.location.resolve(repo)
  const x = placement.refDirection!.resolve(repo)
  const z = placement.axis!.resolve(repo)
  const y = [
    z.dy * x.dz - z.dz * x.dy,
    z.dz * x.dx - z.dx * x.dz,
    z.dx * x.dy - z.dy * x.dx,
  ]
  const vertices = entities
    .filter((entity) => entity instanceof VertexPoint)
    .map((vertex) => {
      const p = vertex.pnt.resolve(repo)
      return [
        origin.x + p.x * x.dx + p.y * y[0] + p.z * z.dx,
        origin.y + p.x * x.dy + p.y * y[1] + p.z * z.dy,
        origin.z + p.x * x.dz + p.y * y[2] + p.z * z.dz,
      ]
    })
  expect(step).not.toContain("MOTOR")
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

test("assembly STEP exports touching printed parts in separate STEP files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "enclosure.circuit.json")
  const circuitJson: CircuitJson = ["BASE", "COVER"].flatMap(
    (name, index): CircuitJson => [
      {
        type: "source_component",
        source_component_id: name,
        ftype: "printedpart",
        name,
      },
      {
        type: "cad_component",
        cad_component_id: `${name}_cad`,
        source_component_id: name,
        position: { x: index * 4, y: 0, z: 0 },
        model_jscad: { type: "cuboid", size: [4, 6, 2] },
        model_object_fit: "contain_within_bounds",
        anchor_alignment: "center",
      },
    ],
  )
  await writeFile(circuitPath, JSON.stringify(circuitJson))
  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} -f assembly-step`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "enclosure.circuit-assembly.zip")),
  )
  expect(Object.keys(zip.files)).toEqual(["BASE.step", "COVER.step"])
  for (const name of ["BASE", "COVER"]) {
    const step = await zip.file(`${name}.step`)!.async("string")
    expect(step).toStartWith("ISO-10303-21;")
    expect(step.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(1)
    expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(1)
    expect(step).toContain(`'${name}'`)
    expect(step).not.toContain(name === "BASE" ? "'COVER'" : "'BASE'")
    expect(step.trimEnd()).toEndWith("END-ISO-10303-21;")
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
    await Bun.file(path.join(tmpDir, "missing.circuit-assembly.zip")).exists(),
  ).toBe(false)
}, 30_000)
