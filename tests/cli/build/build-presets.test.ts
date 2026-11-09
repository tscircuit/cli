import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const source = `
import { z } from "zod"
export const propsSchema = z.object({
  resistorName: z.string().default("R1"),
  omitCapacitor: z.boolean().default(false),
})
export const presets = {
  renamed: { resistorName: "R2" },
  resistor_only: { omitCapacitor: true },
}
export default (input = {}) => {
  const props = propsSchema.parse(input)
  return <board width="12mm" height="10mm">
    <resistor name={props.resistorName} resistance="1k" footprint="0402" pcbX={-3} schX={-3} />
    {!props.omitCapacitor && <capacitor name="C1" capacitance="10nF" footprint="0402" pcbX={3} schX={3} />}
  </board>
}
`

for (const concurrency of [1, 2]) {
  test(`build presets produce ordinary publishable artifacts with concurrency ${concurrency}`, async () => {
    const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
      loggedIn: true,
      preload: path.resolve("tests/fixtures/runframe-cdn-preload.ts"),
    })
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
    )
    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "@tsci/test-user.preset-board",
        version: "1.0.0",
      }),
    )
    await writeFile(path.join(tmpDir, "index.circuit.tsx"), source)
    const result = await runCommand(
      `tsci build --concurrency ${concurrency} --disable-parts-engine --routing-disabled --glbs --pcb-svgs --schematic-svgs --all-images --site --use-cdn-javascript`,
    )
    expect(result.exitCode).toBe(0)

    for (const [directory, names] of [
      ["index", ["R1", "C1"]],
      ["index/renamed", ["R2", "C1"]],
      ["index/resistor_only", ["R1"]],
    ] as const) {
      const outputDir = path.join(tmpDir, "dist", directory)
      const circuitJson = JSON.parse(
        await readFile(path.join(outputDir, "circuit.json"), "utf8"),
      ) as AnyCircuitElement[]
      expect(
        circuitJson
          .filter((el) => el.type === "source_component")
          .map((el) => el.name)
          .sort(),
      ).toEqual([...names].sort())
      expect(
        (await readFile(path.join(outputDir, "3d.glb"))).toString("utf8", 0, 4),
      ).toBe("glTF")
      expect(await readFile(path.join(outputDir, "pcb.svg"), "utf8")).toContain(
        "<svg",
      )
      expect(
        await readFile(path.join(outputDir, "schematic.svg"), "utf8"),
      ).toContain("<svg")
    }

    const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
    const window: Record<string, unknown> = {}
    runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], { window })
    expect(window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST).toEqual([
      {
        filePath: "index.circuit.tsx",
        fileStaticAssetUrl: "./index/circuit.json",
      },
      {
        filePath: "dist/index/renamed/circuit.json",
        fileStaticAssetUrl: "./index/renamed/circuit.json",
      },
      {
        filePath: "dist/index/resistor_only/circuit.json",
        fileStaticAssetUrl: "./index/resistor_only/circuit.json",
      },
    ])

    const pushed = await runCommand("tsci push --include-dist")
    expect(pushed.exitCode).toBe(0)
    const uploadedPaths = registryDb.packageFiles.map((file) => file.file_path)
    expect(uploadedPaths).toContain("index.circuit.tsx")
    for (const directory of ["index", "index/renamed", "index/resistor_only"]) {
      expect(uploadedPaths).toContain(`dist/${directory}/circuit.json`)
      expect(uploadedPaths).toContain(`dist/${directory}/3d.glb`)
    }
  }, 60_000)
}

test("explicit injected props still request one build when presets are exported", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await symlink(path.resolve("node_modules"), path.join(tmpDir, "node_modules"))
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(path.join(tmpDir, "index.circuit.tsx"), source)
  const result = await runCommand(
    'tsci build --disable-parts-engine --inject-props {"resistorName":"R9"}',
  )
  expect(result.exitCode).toBe(0)
  expect(
    await readFile(path.join(tmpDir, "dist/index/circuit.json"), "utf8"),
  ).toContain('"R9"')
  expect(
    await Bun.file(
      path.join(tmpDir, "dist/index/renamed/circuit.json"),
    ).exists(),
  ).toBe(false)
}, 30_000)

test("invalid presets fail before writing build artifacts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await symlink(path.resolve("node_modules"), path.join(tmpDir, "node_modules"))
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    source.replace(
      'renamed: { resistorName: "R2" }',
      "renamed: { resistorName: 2 }",
    ),
  )
  const result = await runCommand("tsci build")
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain('invalid preset "renamed"')
  expect(
    await Bun.file(path.join(tmpDir, "dist/index/circuit.json")).exists(),
  ).toBe(false)
}, 30_000)

test("preset names cannot escape dist", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    'export const presets = { "../../escape": {} }; export default () => <board />',
  )
  const result = await runCommand("tsci build")
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain("must use snake_case")
}, 30_000)

test("preset outputs cannot overwrite another entrypoint", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await mkdir(path.join(tmpDir, "index"))
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    "export const presets = { small: {} }; export default () => <board />",
  )
  await writeFile(
    path.join(tmpDir, "index/small.circuit.tsx"),
    "export default () => <board />",
  )
  const result = await runCommand("tsci build")
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain("Multiple builds write to dist/index/small")
}, 30_000)
