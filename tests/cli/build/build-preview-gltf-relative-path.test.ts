import { test, expect } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const createMinimalGlb = () => {
  const json = JSON.stringify({ asset: { version: "2.0" }, scenes: [] })
  const padding = (4 - (json.length % 4)) % 4
  const paddedJson = `${json}${" ".repeat(padding)}`
  const jsonChunk = Buffer.from(paddedJson, "utf8")

  const totalLength = 12 + 8 + jsonChunk.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)

  const chunkHeader = Buffer.alloc(8)
  chunkHeader.writeUInt32LE(jsonChunk.length, 0)
  chunkHeader.writeUInt32LE(0x4e4f534a, 4)

  return Buffer.concat([header, chunkHeader, jsonChunk])
}

test("build with --preview-gltf supports relative cad model URLs", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "relative-model.circuit.tsx")
  const assetsDir = path.join(tmpDir, "assets")

  await mkdir(assetsDir, { recursive: true })
  await writeFile(path.join(assetsDir, "chip.glb"), createMinimalGlb())
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    circuitPath,
    `
  export default () => (
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        cadModel={<cadmodel modelUrl={"./assets/chip.glb"} />}
      />
    </board>
  )
  `,
  )

  const { stderr } = await runCommand(
    `tsci build --preview-gltf ${circuitPath}`,
  )

  expect(stderr).not.toContain("fetch() URL is invalid")

  const gltfContent = await readFile(
    path.join(tmpDir, "dist", "relative-model.gltf"),
    "utf-8",
  )
  const gltf = JSON.parse(gltfContent)

  expect(gltf.asset).toBeDefined()
  expect(gltf.asset.version).toBe("2.0")
}, 60_000)
