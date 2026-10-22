import { mock } from "bun:test"
import * as childProcess from "node:child_process"
import { resolve } from "node:path"

const spawn = childProcess.spawn
const pipelineFixture = resolve(import.meta.dir, "pcb-spice-pipeline.ts")

// Run the real upstream loader with a stand-in for the native solver pipeline.
if (process.env.PCB_SPICE_MOCK_PIPELINE === "true") {
  mock.module("node:child_process", () => ({
    ...childProcess,
    spawn: (...[command, args = [], options]: Parameters<typeof spawn>) => {
      const cliIndex = args.findIndex((arg) => arg.endsWith("/cli.mjs"))
      return cliIndex < 0
        ? spawn(command, args, options)
        : spawn(
            command,
            [
              ...args.slice(0, cliIndex),
              pipelineFixture,
              ...args.slice(cliIndex + 1),
            ],
            options,
          )
    },
  }))
}
