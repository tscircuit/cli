import type { ResultType } from "lib/types/eecircuit-engine"

export const SIMULATION_ENGINE = {
  name: "ngspice",
  package: "@tscircuit/eecircuit-engine",
  version: "1.7.4",
  compatibility: "none",
}

export interface SimulationOutput {
  result: ResultType | null
  info: string
  errors: string[]
  engine: typeof SIMULATION_ENGINE
  spiceString: string
}

export interface SimulationWorkerInput {
  spiceString: string
  timeoutMs: number
}

export type SimulationWorkerMessage =
  | { type: "ready"; spiceString: string }
  | { type: "result"; output: SimulationOutput }
  | { type: "error"; message: string }
