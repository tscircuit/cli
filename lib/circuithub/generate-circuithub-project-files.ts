import type { AnyCircuitElement } from "circuit-json"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadProConverter,
  CircuitJsonToKicadSchConverter,
} from "circuit-json-to-kicad"
import {
  type CircuithubBomRow,
  formatCircuithubBomCsv,
} from "./generate-circuithub-bom"

export interface CircuithubProjectFile {
  filename: string
  content: string
}

/**
 * The files CircuitHub imports a KiCad design from. It needs the whole
 * project, not just the board: with only a `.kicad_pcb` and a BOM, creating
 * a project or revision fails (HTTP 500). 3D models aren't uploaded.
 */
export const generateCircuithubProjectFiles = ({
  circuitJson,
  projectName,
  bomRows,
}: {
  circuitJson: unknown[]
  projectName: string
  bomRows: CircuithubBomRow[]
}): CircuithubProjectFile[] => {
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

  return [
    ...schConverter.getOutputFiles({ schematicFilename }),
    { filename: pcbFilename, content: pcbConverter.getOutputString() },
    {
      filename: `${projectName}.kicad_pro`,
      content: proConverter.getOutputString(),
    },
    { filename: "bom.csv", content: formatCircuithubBomCsv(bomRows) },
  ]
}
