import "bun-match-svg"
import { expect, test } from "bun:test"
import {
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { writeImageAssetsFromCircuitJson } from "cli/build/worker-output-generators"
import { EMPTY_IMAGE_FORMAT_SELECTION } from "cli/build/image-format-selection"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { systemDiagramCode } from "../../fixtures/system-diagram-code"

for (const concurrency of [1, 2]) {
  test(`build generates every system page and assembly SVG (concurrency ${concurrency})`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
    )
    const source = path.join(tmpDir, "device.circuit.tsx")
    await writeFile(
      source,
      systemDiagramCode
        .replace(
          "<group pcbDisabled schematicDisabled>",
          '<board width="10mm" height="10mm"><resistor name="R1" resistance="1k" footprint="0402" />',
        )
        .replace("</group>", "</board>"),
    )
    const outputDir = path.join(tmpDir, "dist/device")
    for (const flags of ["--system-svgs --assembly-svgs", "--svgs"]) {
      await rm(path.join(tmpDir, "dist"), { recursive: true, force: true })
      const result = await runCommand(
        `tsci build ${source} ${flags} --disable-parts-engine --concurrency ${concurrency}`,
      )
      expect(result.exitCode, result.stderr).toBe(0)
      const overview = await readFile(
        path.join(outputDir, "system-overview.svg"),
        "utf8",
      )
      const detail = await readFile(
        path.join(outputDir, "system-detail.svg"),
        "utf8",
      )
      const assembly = await readFile(
        path.join(outputDir, "assembly.svg"),
        "utf8",
      )
      expect(overview).toContain("Main controller")
      expect(overview).toContain("I2C")
      expect(detail).toContain("Radio module")
      expect(detail).not.toContain("Main controller")
      expect(assembly).toContain(">R1<")
      expect(overview + detail + assembly).not.toMatch(/NaN|Infinity/)
      await expect(overview).toMatchSvgSnapshot(
        import.meta.path,
        "build-system-overview",
      )
      await expect(detail).toMatchSvgSnapshot(
        import.meta.path,
        "build-system-detail",
      )
      await expect(assembly).toMatchSvgSnapshot(
        import.meta.path,
        "build-assembly",
      )
      if (flags !== "--svgs") {
        expect(await Bun.file(path.join(outputDir, "pcb.svg")).exists()).toBe(
          false,
        )
        expect(
          await Bun.file(path.join(outputDir, "schematic.svg")).exists(),
        ).toBe(false)
      }
      expect(await Bun.file(path.join(outputDir, "3d.png")).exists()).toBe(
        false,
      )
    }

    // CI workers generate images inside the worker, using a separate writer.
    const circuitJson = JSON.parse(
      await readFile(path.join(outputDir, "circuit.json"), "utf8"),
    )
    const workerDir = path.join(tmpDir, "worker-images")
    const imageFormats = {
      ...EMPTY_IMAGE_FORMAT_SELECTION,
      systemSvgs: true,
      assemblySvgs: true,
    }
    await writeImageAssetsFromCircuitJson(circuitJson, {
      outputDir: workerDir,
      imageFormats,
    })
    for (const name of [
      "system-overview.svg",
      "system-detail.svg",
      "assembly.svg",
    ]) {
      expect(await readFile(path.join(workerDir, name), "utf8")).toBe(
        await readFile(path.join(outputDir, name), "utf8"),
      )
    }
    await writeImageAssetsFromCircuitJson([], {
      outputDir: workerDir,
      imageFormats,
    })
    expect(await readdir(workerDir)).toEqual([])
  }, 90_000)
}

test("system build filenames are safe and unique, and stale page previews are removed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await symlink(path.resolve("node_modules"), path.join(tmpDir, "node_modules"))
  const source = path.join(tmpDir, "overview.tsx")
  await writeFile(source, systemDiagramCode)
  expect(
    (
      await runCommand(
        `tsci export ${source} -f circuit-json --disable-parts-engine`,
      )
    ).exitCode,
  ).toBe(0)
  const circuitJson = JSON.parse(
    await readFile(path.join(tmpDir, "overview.circuit.json"), "utf8"),
  )
  const pages = circuitJson.filter((e: any) => e.type === "system_block_page")
  expect(pages).toHaveLength(2)
  pages[0].name = "../Power Input"
  pages[1].name = "POWER-INPUT"
  const outputDir = path.join(tmpDir, "images")
  await mkdir(outputDir)
  const imageFormats = { ...EMPTY_IMAGE_FORMAT_SELECTION, systemSvgs: true }
  await writeImageAssetsFromCircuitJson(circuitJson, {
    outputDir,
    imageFormats,
  })
  expect((await readdir(outputDir)).sort()).toEqual([
    "system-power-input-2.svg",
    "system-power-input.svg",
  ])
  const singlePage = circuitJson.filter(
    (e: any) =>
      e !== pages[1] &&
      e.system_block_page_id !== pages[1].system_block_page_id,
  )
  await writeImageAssetsFromCircuitJson(singlePage, { outputDir, imageFormats })
  expect(await readdir(outputDir)).toEqual(["system.svg"])
}, 30_000)
