import { expect, test } from "bun:test"
import "bun-match-svg"
import { readFile, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { simulation_pcb_return_current_result } from "circuit-json"
import { convertCircuitJsonToPcbSimulationSvg } from "circuit-to-svg"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// This test runs a fresh Palace solve. The dedicated EM job supplies Python/Docker.
test.skipIf(process.env.TSCI_RUN_RETURN_CURRENT_EM !== "1")(
  "simulate return-current: TSX experiment → Circuit JSON → PCB SVG snapshot",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await symlink(
      join(process.cwd(), "node_modules"),
      join(tmpDir, "node_modules"),
    )
    await writeFile(join(tmpDir, "package.json"), "{}")
    await writeFile(
      join(tmpDir, "board.circuit.tsx"),
      `import { simulation } from "@tscircuit/core"

export default () => (
  <board width={8} height={6} layers={2} thickness={0.8}
    schematicDisabled isViaInPadAllowed>
    <net name="GND" />
    {[-2, 2].map((x, i) => (
      <chip key={i} name={\`U\${i + 1}\`} pcbX={x}
        pinLabels={{ pin1: i === 0 ? "OUT" : "IN", pin2: "GND" }}
        footprint={<footprint>
          <smtpad portHints={["pin1"]} width={0.8} height={0.8} shape="rect" />
          <smtpad portHints={["pin2"]} pcbY={1.5} width={0.8} height={0.8} shape="rect" />
        </footprint>} />
    ))}
    <trace name="SIGNAL" from=".U1 > .OUT" to=".U2 > .IN" thickness={0.18}
      pcbPathRelativeTo=".U1 > .OUT" pcbPath={[{ x: 0, y: 0 }, { x: 4, y: 0 }]} />
    <trace from=".U1 > .GND" to="net.GND" />
    <trace from=".U2 > .GND" to="net.GND" />
    {[-2, 2].map((x, i) => (
      <via key={i} name={\`GV\${i + 1}\`} pcbX={x} pcbY={1.5}
        fromLayer="top" toLayer="bottom" holeDiameter={0.2} outerDiameter={0.6}
        connectsTo="net.GND" />
    ))}
    <copperpour layer="bottom" connectsTo="net.GND"
      boardEdgeMargin={0.2} padMargin={0} traceMargin={0} />
    <simulation.pcbreturncurrentsimulation name="Explicit GND return">
      <simulation.pcbreturncurrentexcitation
        source=".U1 > .OUT" load=".U2 > .IN" trace=".SIGNAL" ground="net.GND"
        returnSource=".U2 > .GND" returnSink=".U1 > .GND"
        current="5mA" sourceImpedance="25ohm" loadImpedance="100ohm" />
    </simulation.pcbreturncurrentsimulation>
  </board>
)
`,
    )

    const { exitCode, stderr } = await runCommand(
      "tsci simulate return-current board.circuit.tsx --frequency-hz 1000000 --sample-layer bottom --cell-size 0.1 --mesh-size 2 --order 1 --air-padding 2 --processes 1 --output em --result-json result.circuit.json",
    )
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)

    const circuitJson = JSON.parse(
      await readFile(join(tmpDir, "result.circuit.json"), "utf8"),
    )
    const result = simulation_pcb_return_current_result.parse(
      circuitJson.find(
        (element: { type: string }) =>
          element.type === "simulation_pcb_return_current_result",
      ),
    )
    expect(result.frequency_hz).toBe(1_000_000)

    const svg = await convertCircuitJsonToPcbSimulationSvg(circuitJson, {
      simulationResultId: result.simulation_pcb_return_current_result_id,
      layer: "bottom",
      width: 600,
      height: 600,
      includeVersion: false,
      returnCurrent: { showVectors: true },
    })
    expect(svg).toContain('data-type="simulation_pcb_return_current_heatmap"')
    await expect(svg).toMatchSvgSnapshot(import.meta.path, "return-current")
  },
  { timeout: 180_000 },
)
