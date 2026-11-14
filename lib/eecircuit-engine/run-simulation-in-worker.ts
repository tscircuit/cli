import type * as EecircuitEngine from "lib/types/eecircuit-engine"
import { runSimulationWithWatchdog } from "./run-simulation-with-watchdog"
import { SIMULATION_ENGINE, type SimulationOutput } from "./simulation-types"
import { isFatalSimulationDiagnostic } from "./is-fatal-simulation-diagnostic"

import { promises as fs, existsSync } from "node:fs"
import path from "node:path"
import os from "node:os"
import { randomUUID } from "node:crypto"

const fetchSimulation = async (): Promise<
  typeof EecircuitEngine.Simulation
> => {
  // Using a predictable path in tmp to avoid re-downloading.
  // This is a workaround for Bun's test environment not handling URL imports.
  const tempFilePath = path.join(
    os.tmpdir(),
    `tscircuit-eecircuit-engine-${SIMULATION_ENGINE.version}.mjs`,
  )

  if (!existsSync(tempFilePath)) {
    const url = `https://jscdn.tscircuit.com/@tscircuit/eecircuit-engine/${SIMULATION_ENGINE.version}/dist/eecircuit-engine.mjs`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch @tscircuit/eecircuit-engine from ${url}: ${response.statusText}`,
      )
    }
    const scriptContent = await response.text()
    // Concurrent isolated runs must never import a partially written module.
    const downloadPath = `${tempFilePath}.${randomUUID()}.tmp`
    try {
      await fs.writeFile(downloadPath, scriptContent)
      await fs.rename(downloadPath, tempFilePath)
    } finally {
      await fs.rm(downloadPath, { force: true })
    }
  }

  const module = await import(tempFilePath)
  return module.Simulation as typeof EecircuitEngine.Simulation
}

const initializeSimulation = async () => {
  const Simulation = await fetchSimulation()
  const sim = new Simulation()
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
  return sim
}

export const runSimulationInWorker = async (
  spiceString: string,
  {
    onInitialized,
    timeoutMs,
  }: {
    onInitialized: (netlist: string) => Promise<void>
    timeoutMs: number
  },
): Promise<SimulationOutput> => {
  const sim = await initializeSimulation()

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
  await onInitialized(engineSpiceString)
  try {
    // Keep unresolved ngspice aborts from silently ending the CLI process.
    const result = await runSimulationWithWatchdog(sim, { timeoutMs })
    return {
      result,
      info: sim.getInfo(),
      errors: sim.getError(),
      engine: SIMULATION_ENGINE,
      spiceString: engineSpiceString,
    }
  } catch (error) {
    const engineErrors = sim.getError()
    const message = error instanceof Error ? error.message : String(error)
    const fatalErrors = engineErrors.filter(isFatalSimulationDiagnostic)
    // Runtime exceptions may repeat all diagnostics already returned by ngspice.
    const repeatsFatalErrors =
      fatalErrors.length > 0 &&
      fatalErrors.every((diagnostic) => message.includes(diagnostic))
    return {
      result: null,
      info: sim.getInfo(),
      errors: repeatsFatalErrors
        ? engineErrors
        : [...engineErrors, `Error: ${message}`],
      engine: SIMULATION_ENGINE,
      spiceString: engineSpiceString,
    }
  }
}
