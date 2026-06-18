import { test, expect } from "bun:test"
import { readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

const boostSimulationCircuitCode = `
export default () => (
  <board width={30} height={30}>
    <voltagesource
      name="V1"
      voltage="5V"
      schY={2}
      schX={-5}
      schRotation={270}
    />
    <trace from=".V1 > .pin1" to=".L1 > .pin1" />
    <trace from=".L1 > .pin2" to=".D1 > .anode" />
    <trace from=".D1 > .cathode" to=".C1 > .pin1" />
    <trace from=".D1 > .cathode" to=".R1 > .pin1" />
    <trace from=".C1 > .pin2" to=".R1 > .pin2" />
    <trace from=".R1 > .pin2" to=".V1 > .pin2" />
    <trace from=".L1 > .pin2" to=".M1 > .drain" />
    <trace from=".M1 > .source" to=".V1 > .pin2" />
    <trace from=".M1 > .source" to="net.GND" />
    <trace from=".M1 > .gate" to=".V2 > .pin1" />
    <trace from=".V2 > .pin2" to=".V1 > .pin2" />
    <inductor name="L1" inductance="1H" footprint="0603" schY={3} pcbY={6} pcbX={-3} />
    <diode name="D1" footprint="0603" schY={3} schX={3} pcbY={6} pcbX={3} />
    <capacitor
      polarized
      schRotation={270}
      name="C1"
      capacitance="10uF"
      footprint="0603"
      schX={3}
      pcbX={3}
    />
    <resistor
      schRotation={270}
      name="R1"
      resistance="1k"
      footprint="0603"
      schX={6}
      pcbX={9}
    />
    <voltagesource
      name="V2"
      schRotation={270}
      voltage="10V"
      waveShape="square"
      dutyCycle={0.68}
      frequency="1kHz"
      schX={-3}
    />
    <mosfet
      channelType="n"
      footprint="sot23"
      name="M1"
      mosfetMode="enhancement"
      pcbX={-4}
    />
    <voltageprobe
      name="VOUT_PROBE"
      connectsTo=".D1 > .cathode"
      referenceTo="net.GND"
      color="#315cff"
      display={{ label: "VOUT" }}
    />
    <analogsimulation
      duration="2ms"
      timePerStep="10us"
      spiceEngine="ngspice"
    />
  </board>
)`

const writeBoostSimulationCircuit = async (tmpDir: string) => {
  const circuitPath = path.join(tmpDir, "simulation.circuit.tsx")
  await writeFile(circuitPath, boostSimulationCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  return circuitPath
}

test("build --pcb-svgs generates only pcb.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pcb-svgs ${circuitPath}`)

  const pcbSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(pcbSvg).toContain("<svg")

  expect(
    stat(path.join(tmpDir, "dist", "preview", "schematic.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "3d.png")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --pngs generates only 3d.png", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pngs ${circuitPath}`)

  const preview3d = await readFile(
    path.join(tmpDir, "dist", "preview", "3d.png"),
  )
  expect(preview3d.byteLength).toBeGreaterThan(0)
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)

  expect(
    stat(path.join(tmpDir, "dist", "preview", "pcb.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "schematic.svg")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --pcb-png generates only pcb.png", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pcb-png ${circuitPath}`)

  const pcbPng = await readFile(path.join(tmpDir, "dist", "preview", "pcb.png"))
  expect(pcbPng.byteLength).toBeGreaterThan(0)
  expect(pcbPng[0]).toBe(0x89)
  expect(pcbPng[1]).toBe(0x50)
  expect(pcbPng[2]).toBe(0x4e)
  expect(pcbPng[3]).toBe(0x47)

  expect(
    stat(path.join(tmpDir, "dist", "preview", "pcb.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "schematic.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "3d.png")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --svgs generates only pcb.svg and schematic.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --svgs ${circuitPath}`)

  const pcbSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")

  expect(
    stat(path.join(tmpDir, "dist", "preview", "3d.png")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --simulation-svgs generates only simulation.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeBoostSimulationCircuit(tmpDir)

  await runCommand(`tsci build --simulation-svgs ${circuitPath}`)

  const simulationSvg = await readFile(
    path.join(tmpDir, "dist", "simulation", "simulation.svg"),
    "utf-8",
  )
  expect(simulationSvg).toContain("<svg")

  expect(
    stat(path.join(tmpDir, "dist", "simulation", "schematic-simulation.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "simulation", "pcb.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "simulation", "schematic.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "simulation", "3d.png")),
  ).rejects.toBeTruthy()
}, 60_000)

test("build --schematic-simulation-svgs generates only schematic-simulation.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeBoostSimulationCircuit(tmpDir)

  await runCommand(`tsci build --schematic-simulation-svgs ${circuitPath}`)

  const schematicSimulationSvg = await readFile(
    path.join(tmpDir, "dist", "simulation", "schematic-simulation.svg"),
    "utf-8",
  )
  expect(schematicSimulationSvg).toContain("<svg")

  expect(
    stat(path.join(tmpDir, "dist", "simulation", "simulation.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "simulation", "pcb.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "simulation", "schematic.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "simulation", "3d.png")),
  ).rejects.toBeTruthy()
}, 60_000)

test("build --schematic-svgs generates only schematic.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --schematic-svgs ${circuitPath}`)

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")

  expect(
    stat(path.join(tmpDir, "dist", "preview", "pcb.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "3d.png")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --3d generates pcb.svg, schematic.svg, and 3d.png", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --3d ${circuitPath}`)

  const pcbSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")

  const preview3d = await readFile(
    path.join(tmpDir, "dist", "preview", "3d.png"),
  )
  expect(preview3d.byteLength).toBeGreaterThan(0)
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)
}, 30_000)

test("build --3d-png generates pcb.svg, schematic.svg, and 3d.png", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --3d-png ${circuitPath}`)

  const pcbSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")

  const preview3d = await readFile(
    path.join(tmpDir, "dist", "preview", "3d.png"),
  )
  expect(preview3d.byteLength).toBeGreaterThan(0)
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)
}, 30_000)

test("build --pcb-only generates only pcb.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pcb-only ${circuitPath}`)

  const pcbSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "pcb.svg"),
    "utf-8",
  )
  expect(pcbSvg).toContain("<svg")
  expect(
    stat(path.join(tmpDir, "dist", "preview", "schematic.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "3d.png")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --schematic-only generates only schematic.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --schematic-only ${circuitPath}`)

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "preview", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")
  expect(
    stat(path.join(tmpDir, "dist", "preview", "pcb.svg")),
  ).rejects.toBeTruthy()
  expect(
    stat(path.join(tmpDir, "dist", "preview", "3d.png")),
  ).rejects.toBeTruthy()
}, 30_000)
