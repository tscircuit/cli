import "bun-match-svg"
import { expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertRawEasyToTsx } from "easyeda/browser"
import lm5146 from "../../fixtures/assets/easyeda/c3188679.raweasy.json"
import tps259474 from "../../fixtures/assets/easyeda/c3662807.raweasy.json"
import { renderImportedPowerComponent } from "../../fixtures/render-imported-power-component"

const powerParts = [
  {
    partNumber: "C3188679",
    componentName: "LM5146RGYR",
    rawEasy: lm5146,
    pins: [
      { pinNumber: 1, rawLabel: "EN/UVLO", aliases: ["EN", "UVLO"] },
      { pinNumber: 3, rawLabel: "SS/TRK", aliases: ["SS", "TRK"] },
    ],
  },
  {
    partNumber: "C3662807",
    componentName: "TPS259474ARPWR",
    rawEasy: tps259474,
    pins: [
      { pinNumber: 1, rawLabel: "EN/UVLO", aliases: ["EN", "UVLO"] },
      // The source symbol lists other family variants too. Check the functions
      // actually available on TPS259474A against its datasheet.
      { pinNumber: 2, rawLabel: "OVLO/OVCSEL", aliases: ["OVLO"] },
      { pinNumber: 3, rawLabel: "PG/AUXOFF", aliases: ["PG"] },
      { pinNumber: 4, rawLabel: "PGTH/FLT#", aliases: ["PGTH"] },
    ],
  },
]

for (const { partNumber, componentName, rawEasy, pins } of powerParts) {
  test(`${partNumber} imported power-pin labels`, async () => {
    for (const { pinNumber, rawLabel } of pins) {
      expect(
        rawEasy.dataStr.shape.find(
          (shape) =>
            shape.startsWith("P~") && shape.split("~")[3] === String(pinNumber),
        ),
      ).toContain(`~${rawLabel}~`)
    }

    // Exercise the browser export used by importComponentFromJlcpcb.
    // Recorded model bounds keep the conversion independent of network access.
    const tsx = await convertRawEasyToTsx({ rawEasy })
    const circuitJson = await renderImportedPowerComponent({
      tsx,
      componentName,
    })
    const sourcePorts = circuitJson.filter(
      (element) => element.type === "source_port",
    )
    const importedPins = pins.map(({ pinNumber, aliases }) => {
      const sourcePort = sourcePorts.find(
        (port) => port.pin_number === pinNumber,
      )
      if (!sourcePort) throw new Error(`Missing ${partNumber} pin ${pinNumber}`)
      for (const alias of aliases) {
        expect(sourcePort.port_hints).toContain(alias)
      }
      return {
        pinNumber,
        name: sourcePort.name,
        aliases: sourcePort.port_hints,
      }
    })

    expect(importedPins).toMatchSnapshot(`${partNumber}-pin-labels`)
    await expect(
      convertCircuitJsonToSchematicSvg(circuitJson),
    ).toMatchSvgSnapshot(import.meta.path, `${partNumber}-schematic`)
    await expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
      `${partNumber}-pcb`,
    )
  })

  for (const { pinNumber, aliases } of pins) {
    for (const alias of aliases) {
      test(`${partNumber}: ${alias} connects to pin ${pinNumber} and its PCB pad`, async () => {
        const tsx = await convertRawEasyToTsx({ rawEasy })
        const circuitJson = await renderImportedPowerComponent({
          tsx,
          componentName,
          alias,
        })
        const sourcePort = circuitJson.find(
          (element) =>
            element.type === "source_port" && element.pin_number === pinNumber,
        )
        if (sourcePort?.type !== "source_port") {
          throw new Error(`Missing ${partNumber} pin ${pinNumber}`)
        }
        const traces = circuitJson.filter(
          (element) => element.type === "source_trace",
        )
        expect(traces).toHaveLength(1)
        expect(traces[0].connected_source_port_ids).toEqual([
          sourcePort.source_port_id,
        ])
        const pcbPorts = circuitJson
          .filter((element) => element.type === "pcb_port")
          .filter(
            (element) => element.source_port_id === sourcePort.source_port_id,
          )
        expect(pcbPorts).toHaveLength(1)
        const pads = circuitJson
          .filter((element) => element.type === "pcb_smtpad")
          .filter((element) => element.pcb_port_id === pcbPorts[0].pcb_port_id)
        expect(pads).toHaveLength(1)
        expect(pads[0].port_hints).toContain(`pin${pinNumber}`)
      })
    }
  }
}
