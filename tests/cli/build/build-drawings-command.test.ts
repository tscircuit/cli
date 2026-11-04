import "bun-match-svg"
import { expect, test } from "bun:test"
import { writeFile, readFile, symlink, rm } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { carrierDrawingCode } from "../../fixtures/drawings/carrier-drawing-code"

test("build generates named drawing pages in serial and worker modes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await symlink(
    path.resolve("node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  await writeFile(path.join(tmpDir, "carrier.circuit.tsx"), carrierDrawingCode)
  for (const flags of [
    "--drawings",
    "--drawing carrier-plan.svg --concurrency 2",
  ]) {
    await rm(path.join(tmpDir, "dist"), { recursive: true, force: true })
    const result = await runCommand(
      `tsci build ${path.join(tmpDir, "carrier.circuit.tsx")} ${flags} --disable-parts-engine`,
    )
    expect(result.exitCode, result.stderr).toBe(0)
    const svg = await readFile(
      path.join(tmpDir, "dist/carrier/drawings/carrier-plan.svg"),
      "utf8",
    )
    expect(svg).toContain("<svg")
    expect(svg).toContain("CONTROLLER MOUNTING BRACKET")
    expect(svg).toContain("ISOMETRIC")
    expect(svg.match(/<image /g)).toHaveLength(3)
    const circuitJson = JSON.parse(
      await readFile(path.join(tmpDir, "dist/carrier/circuit.json"), "utf8"),
    )
    expect(
      circuitJson.find(
        (e: any) => e.type === "drawing_part_view" && e.name === "isometric",
      ),
    ).toMatchObject({ direction: "isometric" })
    expect(
      circuitJson
        .filter((e: any) => e.type === "drawing_dimension_line")
        .map((e: any) => e.text),
    ).toEqual(["56 mm", "38 mm", "28 mm"])
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      "build-assembly-drawing",
    )
  }
}, 120_000)
