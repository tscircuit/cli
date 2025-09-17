import type * as EecircuitEngine from "lib/types/eecircuit-engine"

export interface SimulationOutput {
  result: EecircuitEngine.ResultType
  info: string
  errors: string[]
}
import { promises as fs, existsSync } from "node:fs"
import path from "node:path"
import os from "node:os"

let sim: EecircuitEngine.Simulation | null = null

const fetchSimulation = async (): Promise<
  typeof EecircuitEngine.Simulation
> => {
  // Using a predictable path in tmp to avoid re-downloading.
  // This is a workaround for Bun's test environment not handling URL imports.
  const tempFilePath = path.join(os.tmpdir(), "eecircuit-engine-1.5.2.mjs")

  if (!existsSync(tempFilePath)) {
    const url = "https://cdn.jsdelivr.net/npm/eecircuit-engine@1.5.2/+esm"
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch eecircuit-engine from ${url}: ${response.statusText}`,
      )
    }
    const scriptContent = await response.text()
    await fs.writeFile(tempFilePath, scriptContent)
  }

  const module = await import(tempFilePath)
  return module.Simulation as typeof EecircuitEngine.Simulation
}

const initializeSimulation = async () => {
  if (sim && sim.isInitialized()) return
  const Simulation = await fetchSimulation()
  sim = new Simulation()
  sim.start() // This is async, but we won't wait for it to complete

  const startTime = Date.now()
  const timeout = 15000 // 15 seconds

  while (!sim.isInitialized()) {
    if (Date.now() - startTime > timeout) {
      console.error("Error: Simulation engine initialization timed out.")
      const initInfo = sim.getInitInfo()
      if (initInfo) {
        console.error("Initialization Info:", initInfo)
      }
      const errors = sim.getError()
      if (errors && errors.length > 0) {
        console.error("Errors:", errors.join("\n"))
      }
      throw new Error("Simulation engine initialization timed out.")
    }
    await new Promise((resolve) => setTimeout(resolve, 200)) // Poll every 200ms
  }
}

export const runSimulation = async (
  spiceString: string,
): Promise<SimulationOutput> => {
  await initializeSimulation()
  if (!sim) throw new Error("Simulation not initialized")

  let engineSpiceString = spiceString
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
  }
}
