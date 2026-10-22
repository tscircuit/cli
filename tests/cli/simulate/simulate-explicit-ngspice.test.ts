import { expect, test } from "bun:test"
import { getPcbSpiceFixture, runPcbSpiceCli } from "tests/fixtures/pcb-spice"

test("simulate analog preserves explicit ngspice experiments", async () => {
  const cwd = await getPcbSpiceFixture(`import { analog } from "@tscircuit/core"
export default () => <board width={10} height={10} routingDisabled>
  <voltagesource name="V1" voltage="5V" />
  <resistor name="R1" resistance="1k" footprint="0402" />
  <trace from=".V1 > .pin1" to=".R1 > .pin1" />
  <trace from=".V1 > .pin2" to=".R1 > .pin2" />
  <analog.transientsimulation spiceEngine="ngspice" duration="1ms" timePerStep="10us" />
</board>`)
  const result = await runPcbSpiceCli({ cwd, mockPipeline: false })
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("Index  time")
  expect(result.stdout).toContain("v(n")
  expect(result.stdout).not.toContain("Simulation report:")
}, 30000)
