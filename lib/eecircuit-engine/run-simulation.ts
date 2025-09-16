import type * as EecircuitEngine from "lib/types/eecircuit-engine"
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
  await sim.start()
}

export const runSimulation = async (spiceString: string) => {
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
  return result
}
