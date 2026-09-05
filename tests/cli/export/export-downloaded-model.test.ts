import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// Same nested static-asset import structure produced by tsci import --download.
const obj = "v 0 0 0\nv 2 0 0\nv 0 2 0\nf 1 2 3\n"

for (const format of ["glb", "gltf"] as const) {
  test(`export ${format} includes geometry from a downloaded OBJ`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const componentDir = path.join(tmpDir, "imports", "DownloadedPart")
    await mkdir(componentDir, { recursive: true })
    await writeFile(path.join(componentDir, "part.obj"), obj)
    await writeFile(
      path.join(componentDir, "part.tsx"),
      `
import objPath from "./part.obj"
export const DownloadedPart = () => (
  <chip name="U1" footprint="soic8" cadModel={{ objUrl: objPath }} />
)
`,
    )
    await writeFile(
      path.join(tmpDir, "index.tsx"),
      `
import { DownloadedPart } from "./imports/DownloadedPart/part"
export default () => <board width="20mm" height="20mm"><DownloadedPart /></board>
`,
    )
    const result = await runCommand(`tsci export index.tsx -f ${format}`)
    expect(result.exitCode).toBe(0)
    const output = await readFile(path.join(tmpDir, `index.${format}`))
    const gltf = JSON.parse(
      format === "glb"
        ? output.subarray(20, 20 + output.readUInt32LE(12)).toString()
        : output.toString(),
    )
    const component = gltf.nodes.find(
      (node: { name?: string }) => node.name === "U1",
    )
    expect(component).toBeDefined()
    const primitives = gltf.meshes[component.mesh].primitives
    const vertexCount = primitives.reduce(
      (total: number, primitive: any) =>
        total + gltf.accessors[primitive.attributes.POSITION].count,
      0,
    )
    expect(vertexCount).toBe(3)
    expect(await readFile(path.join(componentDir, "part.obj"), "utf8")).toBe(
      obj,
    )
  }, 30000)
}
