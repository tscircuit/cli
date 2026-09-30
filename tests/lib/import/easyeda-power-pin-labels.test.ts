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
      { pinNumber: 1, rawLabel: "EN/UVLO" },
      { pinNumber: 3, rawLabel: "SS/TRK" },
    ],
  },
  {
    partNumber: "C3662807",
    componentName: "TPS259474ARPWR",
    rawEasy: tps259474,
    pins: [
      { pinNumber: 1, rawLabel: "EN/UVLO" },
      { pinNumber: 2, rawLabel: "OVLO/OVCSEL" },
      { pinNumber: 3, rawLabel: "PG/AUXOFF" },
      { pinNumber: 4, rawLabel: "PGTH/FLT#" },
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
    const importedPins = pins.map(({ pinNumber }) => {
      const sourcePort = sourcePorts.find(
        (port) => port.pin_number === pinNumber,
      )
      if (!sourcePort) throw new Error(`Missing ${partNumber} pin ${pinNumber}`)
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
}
