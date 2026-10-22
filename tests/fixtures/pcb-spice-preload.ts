import { mock } from "bun:test"
import * as childProcess from "node:child_process"
import { resolve } from "node:path"

const spawn = childProcess.spawn
const pipelineFixture = resolve(import.meta.dir, "pcb-spice-pipeline.ts")
const tsx = resolve(import.meta.dir, "../../node_modules/.bin/tsx")

// Run the real upstream loader with a stand-in for the native solver pipeline.
if (process.env.PCB_SPICE_MOCK_PIPELINE === "true") {
  mock.module("node:child_process", () => ({
    ...childProcess,
    spawn: (...[command, args = [], options]: Parameters<typeof spawn>) => {
      const cliIndex = args.findIndex((arg) => arg.endsWith("/cli.mjs"))
      return cliIndex < 0
        ? spawn(command, args, options)
        : spawn(tsx, [pipelineFixture, ...args.slice(cliIndex + 1)], options)
    },
  }))
}
