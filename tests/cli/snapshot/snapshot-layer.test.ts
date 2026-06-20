import { expect, test } from "bun:test"
import "bun-match-svg"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("snapshot command creates top and bottom PCB layer snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "motor-shield.board.tsx"),
    `
      import React from "react"

      export default () => (
        <board width="50mm" height="40mm">
          <hole pcbX="-21mm" pcbY="16mm" diameter="3.2mm" />
          <hole pcbX="21mm" pcbY="16mm" diameter="3.2mm" />
          <hole pcbX="-21mm" pcbY="-16mm" diameter="3.2mm" />
          <hole pcbX="21mm" pcbY="-16mm" diameter="3.2mm" />
          <silkscreentext text="MOTOR SHIELD V1" pcbX="0mm" pcbY="16mm" fontSize={1.5} />
          <pinheader name="J_PWR" pinCount={2} pcbX="-18mm" pcbY="0mm" />
          <pinheader name="J_CTRL" pinCount={3} pcbX="-14mm" pcbY="-12mm" />
          <chip
            name="U_L293D"
            footprint="dip16"
            pcbX="0mm"
            pcbY="0mm"
            pinLabels={{
              pin1: "EN1",
              pin2: "IN1",
              pin3: "OUT1",
              pin4: "GND_L",
              pin6: "OUT2",
              pin7: "IN2",
              pin8: "VMOTOR",
              pin12: "GND_R",
              pin16: "VCC",
            }}
          />
          <chip
            name="Q_FAN"
            footprint="sot23"
            pcbX="10mm"
            pcbY="10mm"
            pinLabels={{ pin1: "GATE", pin2: "SOURCE", pin3: "DRAIN" }}
          />
          <pinheader name="J_MOTOR" pinCount={2} pcbX="18mm" pcbY="0mm" />
          <pinheader name="J_FAN" pinCount={1} pcbX="18mm" pcbY="10mm" />
          <trace from=".J_PWR > .pin1" to=".U_L293D > .VMOTOR" thickness="0.8mm" />
          <trace from=".U_L293D > .VMOTOR" to=".U_L293D > .VCC" thickness="0.4mm" />
          <trace from=".J_PWR > .pin2" to=".U_L293D > .GND_L" thickness="0.8mm" layer="bottom" />
          <trace from=".U_L293D > .GND_L" to=".U_L293D > .GND_R" thickness="0.8mm" layer="bottom" />
          <trace from=".U_L293D > .GND_R" to=".Q_FAN > .SOURCE" thickness="0.6mm" layer="bottom" />
          <trace from=".J_CTRL > .pin1" to=".U_L293D > .IN1" thickness="0.2mm" />
          <trace from=".J_CTRL > .pin2" to=".U_L293D > .IN2" thickness="0.2mm" />
          <trace from=".J_CTRL > .pin3" to=".Q_FAN > .GATE" thickness="0.2mm" layer="bottom" />
          <trace from=".U_L293D > .OUT1" to=".J_MOTOR > .pin1" thickness="0.8mm" />
          <trace from=".U_L293D > .OUT2" to=".J_MOTOR > .pin2" thickness="0.8mm" layer="bottom" />
          <trace from=".Q_FAN > .DRAIN" to=".J_FAN > .pin1" thickness="0.8mm" />
        </board>
      )
    `,
  )

  await runCommand("tsci snapshot --update --layer top")
  await runCommand("tsci snapshot --update --layer bottom")

  const snapshotDir = join(tmpDir, "__snapshots__")
  const topSnapshot = await Bun.file(
    join(snapshotDir, "motor-shield.board-top.snap.svg"),
  ).text()
  const bottomSnapshot = await Bun.file(
    join(snapshotDir, "motor-shield.board-bottom.snap.svg"),
  ).text()

  expect(topSnapshot).toMatchSvgSnapshot(import.meta.path, "layer-pcb-top")
  expect(bottomSnapshot).toMatchSvgSnapshot(
    import.meta.path,
    "layer-pcb-bottom",
  )
}, 60_000)
