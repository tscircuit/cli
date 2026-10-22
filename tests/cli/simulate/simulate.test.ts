import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `export default () => (
  <board width={30} height={30}>
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

test(
  "simulate analog",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "test-circuit.tsx")

    await writeFile(circuitPath, circuitCode)

    const { stdout, stderr } = await runCommand(
      `tsci simulate analog ${circuitPath}`,
    )

    // Check for tabular headers
    expect(stdout).toContain("Index  time")
    expect(stdout).toContain("v(n") // check for some voltage probe
    expect(stdout).toContain("i(v") // check for some current probe

    // Check for tabular data, ignoring ngspice info output
    const lines = stdout.trim().split("\n")
    const headerLine = lines.find((line) => line.trim().startsWith("Index"))
    expect(headerLine).toBeDefined()

    const headerColumns = headerLine!.trim().split(/\s{2,}/)
    const dataLines = lines.filter((line) => /^\s*\d+\s+/.test(line))
    expect(dataLines.length).toBeGreaterThan(10)

    const firstDataLine = dataLines[0]
    expect(firstDataLine.trim().split(/\s{2,}/).length).toBe(
      headerColumns.length,
    )

    // Check for exponential notation in data
    expect(firstDataLine).toMatch(/\d\.\d{6}e[+-]\d+/)

    // Check that there are no duplicate headers
    const uniqueHeaders = new Set(headerColumns)
    expect(uniqueHeaders.size).toBe(headerColumns.length)
  },
  { timeout: 30000 },
)
