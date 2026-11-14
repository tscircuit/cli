import {
  getNgspiceSimulation,
  NGSPICE_ENGINE,
  rewritePspiceCompatibilitySyntax,
} from "@tscircuit/ngspice-spice-engine"
import type * as EecircuitEngine from "lib/types/eecircuit-engine"

export const SIMULATION_ENGINE = NGSPICE_ENGINE

export interface SimulationOutput {
  result: EecircuitEngine.ResultType
  info: string
  errors: string[]
  engine: typeof NGSPICE_ENGINE
  spiceString: string
}

export const runSimulation = async (
  spiceString: string,
): Promise<SimulationOutput> => {
  // Match the runtime and compatibility mode used by ngspice build/SVG output.
  const sim = await getNgspiceSimulation()

  let engineSpiceString = rewritePspiceCompatibilitySyntax(spiceString)
  const wrdataMatch = engineSpiceString.match(/wrdata\s+(\S+)\s+(.*)/i)
  if (wrdataMatch) {
    const variables = wrdataMatch[2].trim().split(/\s+/)
    const probeLine = `.probe ${variables.join(" ")}`
    engineSpiceString = engineSpiceString.replace(/wrdata.*/i, probeLine)
  } else if (!engineSpiceString.match(/\.probe/i)) {
    const plotMatch = engineSpiceString.match(/plot\s+(.*)/i)
    if (plotMatch) {
      throw new Error(
        "The 'plot' command is not supported for data extraction. Please use 'wrdata <filename> <var1> ...' or '.probe <var1> ...' instead.",
      )
    }
    throw new Error(
      "No '.probe' or 'wrdata' command found in SPICE file. Use 'wrdata <filename> <var1> ...' to specify output.",
    )
  }

  sim.setNetList(engineSpiceString)
  const result = await sim.runSim()
  return {
    result,
    info: sim.getInfo(),
    errors: sim.getError(),
    engine: NGSPICE_ENGINE,
    spiceString: engineSpiceString,
  }
}
