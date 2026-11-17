import type { AnyCircuitElement } from "circuit-json"
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
 * The KiCad project uploaded to CircuitHub, which reads part numbers from
 * the design files. No BOM CSV: CircuitHub can't read tsci's BOM (no column
 * it recognises as the MPN), and uploads that included one were never
 * measured, which leaves quotes on preliminary values. CircuitHub needs the
 * whole project, not just the board: with only a `.kicad_pcb`, creating a
 * project or revision fails (HTTP 500). 3D models aren't uploaded.
 */
export const generateCircuithubProjectFiles = ({
  circuitJson,
  projectName,
}: {
  circuitJson: unknown[]
  projectName: string
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
  ]
}
