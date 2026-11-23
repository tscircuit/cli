import { expect, test } from "bun:test"
import { fp } from "@tscircuit/footprinter"
import { loadFootprinterMesh } from "cli/inspect/model/load-model"
import { copyFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("inspect model measures a generated solid in mm", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci inspect model soic8",
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("size: 5.3 x 4.61 x 1.28 mm")
  expect(stdout).toContain("equivalent model: soic8 (volume IoU 100.00%")
}, 30_000)

test("searches the catalog for a standalone GLB with no footprint hints", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await copyFile(
    path.resolve("examples/glb-loading/soic8.glb"),
    path.join(tmpDir, "body.glb"),
  )
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci inspect model body.glb --json",
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  const { equivalentFootprinter } = JSON.parse(stdout)
  expect(equivalentFootprinter.volumeIntersectionOverUnion).toBeGreaterThan(0.9)
  expect(equivalentFootprinter.volumeIntersectionOverUnion).toBeLessThan(0.99)
}, 30_000)

test("inspect model resolves an imported CAD file beside a nested TSX component", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const partsDir = path.join(tmpDir, "parts")
  await mkdir(partsDir)
  await copyFile(
    path.resolve("examples/glb-loading/soic8.glb"),
    path.join(partsDir, "body.glb"),
  )
  await writeFile(
    path.join(partsDir, "somefile.tsx"),
    `
import bodyUrl from "./body.glb"
export const Socket = () => <chip name="U1" footprint="soic8" cadModel={<cadmodel modelUrl={bodyUrl} />} />
`,
  )
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci inspect model ./parts/somefile.tsx",
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("triangles: 2220")
  expect(stdout).toContain("equivalent model: soic8 (volume IoU 92.17%")
}, 30_000)

test("matches an unnamed, rotated model to a parameterized copper candidate", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const spec = "soic18_w7mm_p0.95mm"
  const mesh = await loadFootprinterMesh(spec)
  const lines: string[] = []
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const [x, y, z] = mesh.positions.slice(i, i + 3)
    lines.push(`v ${20 - y!} ${10 + x!} ${2 + z!}`)
  }
  for (let i = 0; i < mesh.indices.length; i += 3) {
    lines.push(
      `f ${mesh.indices
        .slice(i, i + 3)
        .map((index) => index + 1)
        .join(" ")}`,
    )
  }
  await writeFile(path.join(tmpDir, "body.obj"), lines.join("\n"))
  const model = {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    position: { x: 0, y: 0, z: 0 },
    model_obj_url: "./body.obj",
  }
  await writeFile(
    path.join(tmpDir, "part.circuit.json"),
    JSON.stringify([...fp.string(spec).circuitJson(), model]),
  )
  const { stdout, exitCode } = await runCommand(
    "tsci inspect model part.circuit.json --json",
  )
  expect(exitCode).toBe(0)
  const { triangleCount, equivalentFootprinter } = JSON.parse(stdout)
  expect(triangleCount).toBe(mesh.indices.length / 3)
  expect(equivalentFootprinter.footprinterString).toStartWith("soic18_")
  expect(equivalentFootprinter.volumeIntersectionOverUnion).toBeCloseTo(1, 5)
  expect([90, 270]).toContain(equivalentFootprinter.rotationDegrees)
}, 30_000)

test("a footprint hint still needs a 3D match, open meshes still have dimensions", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const file = path.join(tmpDir, "body.obj")
  const vertices = "v 0 0 0\nv 500 0 0\nv 0 500 0\nv 0 0 500\n"
  await writeFile(file, vertices + "f 3 2 1\nf 1 2 4\nf 1 4 3\nf 2 3 4\n")
  const closed = await runCommand(
    "tsci inspect model body.obj --footprint soic8 --json",
  )
  expect(closed.exitCode).toBe(0)
  expect(JSON.parse(closed.stdout)).toMatchObject({
    equivalentFootprinter: null,
    triangleCount: 4,
  })
  expect(JSON.parse(closed.stdout).volumeMm3).toBeCloseTo(500 ** 3 / 6)
  await writeFile(file, vertices + "f 1 2 3\n")
  const open = await runCommand("tsci inspect model body.obj --json")
  expect(open.exitCode).toBe(0)
  expect(JSON.parse(open.stdout)).toMatchObject({
    equivalentFootprinter: null,
    triangleCount: 1,
    volumeMm3: null,
  })
  expect(JSON.parse(open.stdout).searchNote).toContain("closed")
}, 45_000)
