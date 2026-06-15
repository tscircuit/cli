import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"
import { getBuildEntrypoints } from "../../cli/build/get-build-entrypoints"
import "bun-match-svg"

const createTiPlatformConfigModule = ({
  includeBoardFiles,
  extraFields = "",
}: {
  includeBoardFiles?: string[]
  extraFields?: string
} = {}) => {
  const includeBoardFilesField = includeBoardFiles
    ? `  includeBoardFiles: ${JSON.stringify(includeBoardFiles)},\n`
    : ""

  return [
    "export default {",
    includeBoardFilesField,
    extraFields,
    "  platformConfig: {",
    "    footprintLibraryMap: {",
    "      ti: async () => ({",
    "        footprintCircuitJson: [",
    "          {",
    '            type: "source_component",',
    '            source_component_id: "source_component_0",',
    '            ftype: "simple_chip",',
    '            name: "U1"',
    "          },",
    "          {",
    '            type: "source_port",',
    '            source_port_id: "source_port_0",',
    '            source_component_id: "source_component_0",',
    '            name: "pin1",',
    "            pin_number: 1,",
    '            port_hints: ["1"]',
    "          },",
    "          {",
    '            type: "source_port",',
    '            source_port_id: "source_port_1",',
    '            source_component_id: "source_component_0",',
    '            name: "pin2",',
    "            pin_number: 2,",
    '            port_hints: ["2"]',
    "          },",
    "          {",
    '            type: "pcb_component",',
    '            pcb_component_id: "pcb_component_0",',
    '            source_component_id: "source_component_0",',
    "            center: { x: 0, y: 0 },",
    "            width: 2,",
    "            height: 2,",
    '            layer: "top",',
    "            rotation: 0,",
    "            obstructs_within_bounds: true",
    "          },",
    "          {",
    '            type: "pcb_port",',
    '            pcb_port_id: "pcb_port_0",',
    '            source_port_id: "source_port_0",',
    '            pcb_component_id: "pcb_component_0",',
    "            x: -0.6,",
    "            y: 0,",
    '            layers: ["top"]',
    "          },",
    "          {",
    '            type: "pcb_smtpad",',
    '            pcb_smtpad_id: "pcb_smtpad_0",',
    '            pcb_component_id: "pcb_component_0",',
    '            shape: "rect",',
    '            port_hints: ["1"],',
    "            x: -0.6,",
    "            y: 0,",
    "            width: 0.5,",
    "            height: 1,",
    '            layer: "top",',
    "            rotation: 0",
    "          },",
    "          {",
    '            type: "pcb_port",',
    '            pcb_port_id: "pcb_port_1",',
    '            source_port_id: "source_port_1",',
    '            pcb_component_id: "pcb_component_0",',
    "            x: 0.6,",
    "            y: 0,",
    '            layers: ["top"]',
    "          },",
    "          {",
    '            type: "pcb_smtpad",',
    '            pcb_smtpad_id: "pcb_smtpad_1",',
    '            pcb_component_id: "pcb_component_0",',
    '            shape: "rect",',
    '            port_hints: ["2"],',
    "            x: 0.6,",
    "            y: 0,",
    "            width: 0.5,",
    "            height: 1,",
    '            layer: "top",',
    "            rotation: 0",
    "          }",
    "        ]",
    "      })",
    "    }",
    "  }",
    "}",
    "",
  ].join("\n")
}

const tiBoardCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <chip name="U1" footprint="ti:MSP430" />
  </board>
)`

const tiAnalogCircuitCode = `
export default () => (
  <board width={30} height={30}>
    <chip name="U1" footprint="ti:MSP430" pcbX={10} />
    <voltagesource
      name="V1"
      voltage={"5V"}
      schY={2}
      schX={-5}
      schRotation={270}
    />
    <trace from={".V1 > .pin1"} to={".L1 > .pin1"} />
    <trace from={".L1 > .pin2"} to={".D1 > .anode"} />
    <trace from={".D1 > .cathode"} to={".C1 > .pin1"} />
    <trace from={".D1 > .cathode"} to={".R1 > .pin1"} />
    <trace from={".C1 > .pin2"} to={".R1 > .pin2"} />
    <trace from={".R1 > .pin2"} to={".V1 > .pin2"} />
    <trace from={".L1 > .pin2"} to={".M1 > .drain"} />
    <trace from={".M1 > .source"} to={".V1 > .pin2"} />
    <trace from={".M1 > .source"} to={"net.GND"} />
    <trace from={".M1 > .gate"} to={".V2 > .pin1"} />
    <trace from={".V2 > .pin2"} to={".V1 > .pin2"} />
    <inductor name="L1" inductance={"1H"} footprint={"0603"} schY={3} pcbY={6} pcbX={-3} />
    <diode name="D1" footprint={"0603"} schY={3} schX={3} pcbY={6} pcbX={3} />
    <capacitor
      polarized
      schRotation={270}
      name="C1"
      capacitance={"10uF"}
      footprint={"0603"}
      schX={3}
      pcbX={3}
    />
    <resistor
      schRotation={270}
      name="R1"
      resistance={"1k"}
      footprint={"0603"}
      schX={6}
      pcbX={9}
    />
    <voltagesource
      name="V2"
      schRotation={270}
      voltage={"10V"}
      waveShape="square"
      dutyCycle={0.68}
      frequency={"1kHz"}
      schX={-3}
    />
    <mosfet
      channelType="n"
      footprint={"sot23"}
      name="M1"
      mosfetMode="enhancement"
      pcbX={-4}
    />
  </board>
)`

test("getBuildEntrypoints uses tscircuit.config.ts includeBoardFiles and preview paths", async () => {
  const { tmpDir } = await getCliTestFixture()

  await mkdir(join(tmpDir, "boards"), { recursive: true })
  await mkdir(join(tmpDir, "preview"), { recursive: true })
  await writeFile(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "runtime-entrypoints-test" }),
  )
  await writeFile(
    join(tmpDir, "tscircuit.config.ts"),
    [
      "export default {",
      '  includeBoardFiles: ["boards/**/*.board.tsx"],',
      '  previewComponentPath: "preview/preview.tsx",',
      '  siteDefaultComponentPath: "preview/site.tsx",',
      "}",
      "",
    ].join("\n"),
  )
  await writeFile(
    join(tmpDir, "boards", "picked.board.tsx"),
    tiBoardCircuitCode,
  )
  await writeFile(join(tmpDir, "ignored.board.tsx"), tiBoardCircuitCode)

  const entrypoints = await getBuildEntrypoints({ rootDir: tmpDir })

  expect(entrypoints.projectDir).toBe(tmpDir)
  expect(entrypoints.previewComponentPath).toBe(
    join(tmpDir, "preview", "preview.tsx"),
  )
  expect(entrypoints.siteDefaultComponentPath).toBe(
    join(tmpDir, "preview", "site.tsx"),
  )
  expect(entrypoints.circuitFiles).toEqual([
    join(tmpDir, "boards", "picked.board.tsx"),
  ])
})

test("export circuit-json consumes runtime platformConfig from tscircuit.config.ts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = join(tmpDir, "index.circuit.tsx")

  await writeFile(circuitPath, tiBoardCircuitCode)
  await writeFile(
    join(tmpDir, "tscircuit.config.ts"),
    createTiPlatformConfigModule(),
  )

  const { stderr, exitCode } = await runCommand(
    `tsci export ${circuitPath} -f circuit-json`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")

  const circuitJson = JSON.parse(
    await readFile(join(tmpDir, "index.circuit.circuit.json"), "utf-8"),
  )

  expect(
    circuitJson.some((element: any) => element.type === "pcb_smtpad"),
  ).toBe(true)
}, 30_000)

test("simulate analog consumes runtime platformConfig from tscircuit.config.ts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = join(tmpDir, "analog.circuit.tsx")

  await writeFile(circuitPath, tiAnalogCircuitCode)
  await writeFile(
    join(tmpDir, "tscircuit.config.ts"),
    createTiPlatformConfigModule(),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci simulate analog ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toContain("source_port_id")
  expect(stdout).toContain("Index  time")
}, 30_000)

test("snapshot command consumes runtime platformConfig from tscircuit.config.ts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = join(tmpDir, "index.circuit.tsx")

  await writeFile(circuitPath, tiBoardCircuitCode)
  await writeFile(
    join(tmpDir, "tscircuit.config.ts"),
    createTiPlatformConfigModule(),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci snapshot --update`,
  )

  expect(stderr).toBe("")
  expect(stdout).toContain("Created snapshots")

  const snapshotDir = join(tmpDir, "__snapshots__")
  const pcbSnapshot = Bun.file(join(snapshotDir, "index.circuit-pcb.snap.svg"))
  const schematicSnapshot = Bun.file(
    join(snapshotDir, "index.circuit-schematic.snap.svg"),
  )
  expect(pcbSnapshot.text()).toMatchSvgSnapshot(import.meta.path, "pcb")
  expect(schematicSnapshot.text()).toMatchSvgSnapshot(
    import.meta.path,
    "schematic",
  )
})
