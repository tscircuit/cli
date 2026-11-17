import type { AnyCircuitElement } from "circuit-json"
import {
  convertBomRowsToCsv,
  convertCircuitJsonToBomRows,
} from "circuit-json-to-bom-csv"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadProConverter,
  CircuitJsonToKicadSchConverter,
} from "circuit-json-to-kicad"

export interface CircuithubProjectFile {
  filename: string
  content: string
}

/**
 * The files uploaded to CircuitHub: the KiCad project tsci exports and the
 * BOM CSV `tsci export -f gerbers` writes (parts marked do-not-place are
 * left out). CircuitHub needs the whole project, not just the board: with
 * only a `.kicad_pcb` and a BOM, creating a project or revision fails
 * (HTTP 500). 3D models aren't uploaded.
 */
export const generateCircuithubProjectFiles = async ({
  circuitJson,
  projectName,
}: {
  circuitJson: unknown[]
  projectName: string
}): Promise<CircuithubProjectFile[]> => {
  const elements = circuitJson as AnyCircuitElement[]
  const schematicFilename = `${projectName}.kicad_sch`
  const pcbFilename = `${projectName}.kicad_pcb`

  const schConverter = new CircuitJsonToKicadSchConverter(elements)
  schConverter.runUntilFinished()
  const pcbConverter = new CircuitJsonToKicadPcbConverter(elements, {
    projectName,
  })
  pcbConverter.runUntilFinished()
  const proConverter = new CircuitJsonToKicadProConverter(elements, {
    projectName,
    schematicFilename,
    pcbFilename,
  })
  proConverter.runUntilFinished()

  const bomCsv = await convertBomRowsToCsv(
    await convertCircuitJsonToBomRows({ circuitJson: elements }),
  )

  return [
    ...schConverter.getOutputFiles({ schematicFilename }),
    { filename: pcbFilename, content: pcbConverter.getOutputString() },
    {
      filename: `${projectName}.kicad_pro`,
      content: proConverter.getOutputString(),
    },
    { filename: "bom.csv", content: bomCsv },
  ]
}
