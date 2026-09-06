import type { AnyCircuitElement } from "circuit-json"
import {
  convertBomRowsToCsv,
  convertCircuitJsonToBomRows,
} from "circuit-json-to-bom-csv"
import { convertCircuitJsonToGerberFiles } from "circuit-json-to-gerber"
import { convertCircuitJsonToPickAndPlaceCsv } from "circuit-json-to-pnp-csv"
import JSZip from "jszip"

export const convertCircuitJsonToGerbers = async (
  circuitJson: AnyCircuitElement[],
) => {
  const bomRows = await convertCircuitJsonToBomRows({ circuitJson })
  const bomCsv = await convertBomRowsToCsv(bomRows)
  const pnpCsv = await convertCircuitJsonToPickAndPlaceCsv(circuitJson, {
    supplier: "jlcpcb",
  })
  const gerberFiles = convertCircuitJsonToGerberFiles(circuitJson, {
    flip_y_axis: false,
  })
  const zip = new JSZip()
  // ZIP timestamps start in 1980; a fixed date keeps archive metadata stable.
  const zipDate = new Date("1980-01-01T00:00:00.000Z")
  for (const [fileName, fileContents] of Object.entries({
    ...gerberFiles,
    "bom.csv": bomCsv,
    "pick_and_place.csv": pnpCsv,
  })) {
    zip.file(fileName, fileContents, { date: zipDate })
  }

  return {
    gerbersZip: await zip.generateAsync({ type: "nodebuffer" }),
    bomCsv,
    pnpCsv,
  }
}
