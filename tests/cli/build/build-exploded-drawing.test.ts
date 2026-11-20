import "bun-match-svg"
import { expect, test } from "bun:test"
import { readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build drops the exploded view and note from the drawing SVG", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await symlink(
    path.resolve("node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  await writeFile(
    path.join(tmpDir, "cover.circuit.tsx"),
    `import { assembly } from "@tscircuit/core"

export default function CoverAssembly() {
  return (
    <assembly.device name="enclosure">
      <board name="carrier" width={30} height={14} thickness={1} />
      <assembly.part
        name="cover"
        cadModel={{
          jscad: { type: "cuboid", size: [14, 8, 3] },
          positionOffset: { x: 0, y: 0, z: 2 },
        }}
      />
      <assembly.explosion.stage name="lift-cover">
        <assembly.explosion.move targetRefs="cover" offZ={12} />
      </assembly.explosion.stage>
      <assembly.drawing.stage
        name="complete"
        boardRefs={[".carrier"]}
        partRefs={[".cover"]}
      />
      <assembly.drawing.page name="assembly" width={126} height={73}>
        <assembly.drawing.note text="Lift cover 12 mm" paperX={-55} paperY={27} />
        <assembly.drawing.partview
          name="assembled"
          displayName="Assembled"
          stageRef=".complete"
          direction="isometric"
          centerX={-30}
          centerY={-1}
          width={52}
          height={48}
        />
        <assembly.drawing.explosionview
          name="exploded"
          displayName="Exploded"
          stageRef="enclosure.lift-cover"
          direction="isometric"
          centerX={30}
          centerY={-1}
          width={52}
          height={48}
          showTrails
        />
      </assembly.drawing.page>
    </assembly.device>
  )
}
`,
  )

  const result = await runCommand(
    "tsci build cover.circuit.tsx --drawings --disable-parts-engine",
  )
  expect(result.exitCode, result.stderr).toBe(0)
  const svg = await readFile(
    path.join(tmpDir, "dist/cover/drawings/assembly.svg"),
    "utf8",
  )
  expect(svg).toContain("data-drawing-part-view-id=")
  expect(svg).not.toContain("data-drawing-explosion-view-id=")
  expect(svg).not.toContain("Lift cover 12 mm")
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "exploded-drawing")
}, 30_000)
