import { expect, test } from "bun:test"
import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const register = resolve("cli/simulate/register.ts")
const modules = resolve("node_modules")
const board = `
  <board width={10} height={10} routingDisabled schematicDisabled>
    <chip name="U1" pinLabels={{pin1: "DATA", pin2: "GND", pin3: "VCC"}} footprint="sot23" />
  </board>`
const declarations = `
  <ibismodel componentRef=".U1" ibisComponentName="PART"
    ibisModelAsset={{project_relative_path: "models/driver.ibs", url: "https://example.com/driver.ibs", mimetype: "text/plain"}}
    ibisPinNameToPortLabel={{"1": "DATA", "2": "GND", "3": "VCC"}}
    ibisPinNameToReferencePortLabels={{"1": {pullup: "VCC", pulldown: "GND", powerClamp: "VCC", groundClamp: "GND"}}}
    modelValueCorner="typical" includePackageParasitics={false} />
  <analog.transientsimulation name="SI" spiceEngine="pcb_spice" duration="100ns" timePerStep="10ps"
    ibisPinStates={{".U1 > .DATA": {isOutput: true, isOutputEnabled: true}}} />
  <analog.digitalstimulus name="DATA" simulationRef=".SI" sourcePinRef=".U1 > .DATA"
    bitDuration="2.5ns" startTime="0ns" initialState={0}
    transmittedData={{transmissionType: "bits", bits: "0011", repeat: true}} />
  <voltageprobe name="RX" connectsTo=".U1 > .DATA" referenceTo=".U1 > .GND" />
  <analog.eyediagram name="RX_EYE" simulationRef=".SI" probeRef=".RX"
    unitInterval="2.5ns" timeOrigin="0ns" startTime="20ns" />`

const fixture = async () => {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "tsci-pcb-spice-")))
  globalThis.deferredCleanupFns.push(() =>
    rm(cwd, { recursive: true, force: true }),
  )
  await symlink(modules, join(cwd, "node_modules"), "junction")
  await writeFile(join(cwd, "package.json"), '{"type":"module"}')
  await writeFile(
    join(cwd, "cli.ts"),
    `import { Command } from "commander"
import { registerSimulate } from ${JSON.stringify(register)}
const program = new Command()
registerSimulate(program)
await program.parseAsync(process.argv)`,
  )
  // Isolate process/opener mocks from the suite. The upstream TSX loader is
  // exercised separately in real Node, without requiring native solvers.
  await writeFile(
    join(cwd, "preload.ts"),
    `import { mock } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { EventEmitter } from "node:events"
const childProcess = await import("node:child_process")
mock.module("node:child_process", () => ({...childProcess,
  spawn: (command, args) => {
    const child = new EventEmitter()
    queueMicrotask(async () => {
      writeFileSync("invocation.json", JSON.stringify({command, args}))
      if (!process.env.FAIL_SOLVER) {
        await mkdir(args[7], {recursive: true})
        await writeFile(join(args[7], "results.html"), "<html>Test report</html>")
      }
      child.emit("exit", process.env.FAIL_SOLVER ? 1 : 0, null)
    })
    return child
  },
  execFile: (command, args, callback) => {
    writeFileSync("opened.json", JSON.stringify({command, args}))
    callback(null, "", "")
  },
}))`,
  )
  const run = async (
    args: string[],
    { mockSolvers = true, fail = false } = {},
  ) => {
    const child = Bun.spawn(
      [
        process.execPath,
        ...(mockSolvers ? ["--preload", "./preload.ts"] : []),
        join(cwd, "cli.ts"),
        "simulate",
        "analog",
        ...args,
      ],
      {
        cwd,
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          TSCI_TEST_MODE: "true",
          PCB_SPICE_TOOLS: join(cwd, "missing-tools.json"),
          TSCIRCUIT_CONFIG_DIR: join(cwd, ".config"),
          ...(fail ? { FAIL_SOLVER: "1" } : {}),
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    return { stdout, stderr, exitCode }
  }
  const loadEntry = async (file: string) => {
    const child = Bun.spawn(
      [
        "node",
        "--import",
        "tsx/esm",
        "--input-type=module",
        "--eval",
        `
import { loadEntry } from ${JSON.stringify(pathToFileURL(join(modules, "pcb-spice-pipeline/dist/index.js")).href)}
import React from "react"
globalThis.React = React
const entry = await loadEntry(${JSON.stringify(join(cwd, file))})
console.log(JSON.stringify(entry))`,
      ],
      { cwd, stdout: "pipe", stderr: "pipe" },
    )
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (code !== 0) throw new Error(stderr)
    return JSON.parse(stdout)
  }
  return { cwd, run, loadEntry }
}

test("analog dispatches native pcb_spice TSX and opens the completed report", async () => {
  const { cwd, run, loadEntry } = await fixture()
  await writeFile(
    join(cwd, "entry.tsx"),
    `import { analog } from "@tscircuit/core"
export const modeling = {description: "CLI native declarations"}
export default () => ${board.replace("</board>", `${declarations}</board>`)}`,
  )
  const output = "report with spaces"
  const result = await run(["entry.tsx", "--output", output, "--open"])
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe("")
  expect(result.stdout).toContain(join(cwd, output, "results.html"))
  expect(result.stdout).not.toContain("Index  time")
  const invocation = JSON.parse(
    await readFile(join(cwd, "invocation.json"), "utf8"),
  )
  expect(invocation.command).toBe("node")
  expect(invocation.args[0]).toBe("--import")
  expect(invocation.args[4]).toEndWith("/pcb-spice-pipeline/dist/cli.mjs")
  expect(invocation.args.slice(5)).toEqual([
    join(cwd, "entry.tsx"),
    "--out",
    join(cwd, output),
  ])
  const receipt = await loadEntry("entry.tsx")
  expect(receipt.project.root).toBe(cwd)
  expect(receipt.modeling.description).toBe("CLI native declarations")
  for (const type of [
    "simulation_experiment",
    "simulation_ibis_model",
    "simulation_ibis_pin_state",
    "simulation_digital_stimulus",
    "simulation_eye_diagram",
    "simulation_voltage_probe",
  ]) {
    expect(
      receipt.circuitJson.some(
        (record: { type: string }) => record.type === type,
      ),
    ).toBe(true)
  }
  expect(
    receipt.circuitJson.find(
      (record: { type: string }) => record.type === "simulation_experiment",
    ).spice_engine,
  ).toBe("pcb_spice")
  const opened = JSON.parse(await readFile(join(cwd, "opened.json"), "utf8"))
  expect(opened.args.at(-1)).toBe(join(cwd, output, "results.html"))
}, 30000)

test("analog uses upstream ImportedBoard serialization and accepts exported Circuit JSON", async () => {
  const { cwd, run, loadEntry } = await fixture()
  await writeFile(
    join(cwd, "entry.tsx"),
    `import { Circuit, analog } from "@tscircuit/core"
import { ImportedBoard } from "pcb-spice-pipeline/tsx"
const source = new Circuit()
source.add(${board})
await source.renderUntilSettled()
const saved = source.getCircuitJson().map(record => Object.fromEntries(Object.entries(record).map(([key, value]) =>
  [key, key.endsWith("_id") && typeof value === "string" ? "saved_" + value : value])))
const savedBoard = saved.find(record => record.type === "pcb_board")
savedBoard.center = {x: 123, y: -45}
saved.push({type: "pcb_stackup", pcb_stackup_id: "saved-stackup", pcb_board_id: savedBoard.pcb_board_id,
  layers: [{layer_type: "copper", layer: "top", thickness: .035},
    {layer_type: "dielectric", thickness: 1.53, relative_permittivity: 4.1},
    {layer_type: "copper", layer: "bottom", thickness: .035}]})
export const modeling = {description: "Saved routing"}
export default () => <ImportedBoard circuitJson={saved}>${declarations}</ImportedBoard>`,
  )
  const result = await run(["entry.tsx", "--output", "saved-report"])
  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)
  const receipt = await loadEntry("entry.tsx")
  const records = receipt.circuitJson
  expect(
    records.find((r: { type: string }) => r.type === "pcb_board").pcb_board_id,
  ).toStartWith("saved_")
  expect(
    records.find((r: { type: string }) => r.type === "pcb_board").center,
  ).toEqual({ x: 123, y: -45 })
  expect(
    records.find((r: { type: string }) => r.type === "pcb_stackup")
      .pcb_stackup_id,
  ).toBe("saved-stackup")
  expect(
    records.find((r: { type: string }) => r.type === "simulation_ibis_model")
      .source_component_id,
  ).toStartWith("saved_")
  expect(
    records.find((r: { type: string }) => r.type === "simulation_voltage_probe")
      .signal_input_source_port_id,
  ).toStartWith("saved_")

  await writeFile(
    join(cwd, "exported.ts"),
    `export const circuitJson = ${JSON.stringify(records)}
export const modeling = {description: "Exported records"}`,
  )
  expect(
    (await run(["exported.ts", "--output", "exported-report"])).exitCode,
  ).toBe(0)
  expect((await loadEntry("exported.ts")).circuitJson).toEqual(records)
  await writeFile(join(cwd, "circuit.json"), JSON.stringify(records))
  await writeFile(
    join(cwd, "simulation.json"),
    '{"circuit":"circuit.json","description":"JSON modeling"}',
  )
  expect(
    (await run(["simulation.json", "--output", "json-report"])).exitCode,
  ).toBe(0)
  expect((await loadEntry("simulation.json")).circuitJson).toEqual(records)
  const raw = await run(["circuit.json"])
  expect(raw.exitCode).not.toBe(0)
  expect(raw.stderr).toContain(
    "pipeline JSON entry with modeling and a circuit path",
  )
}, 60000)

test("pcb_spice errors fail the CLI and never open a report", async () => {
  const { cwd, run } = await fixture()
  await writeFile(
    join(cwd, "entry.tsx"),
    `import { analog } from "@tscircuit/core"
export const modeling = {}
export default () => ${board.replace("</board>", `${declarations}</board>`)}`,
  )
  const failed = await run(["entry.tsx", "--output", "failed", "--open"], {
    fail: true,
  })
  expect(failed.exitCode).not.toBe(0)
  expect(failed.stderr).toContain("pcb_spice failed (exit 1)")
  expect(await Bun.file(join(cwd, "opened.json")).exists()).toBe(false)

  const missingTools = await run(["entry.tsx"], { mockSolvers: false })
  expect(missingTools.exitCode).not.toBe(0)
  expect(missingTools.stderr).toContain("pcb-spice-pipeline --setup")

  await writeFile(
    join(cwd, "no-modeling.tsx"),
    `import { analog } from "@tscircuit/core"
export default () => ${board.replace("</board>", `${declarations}</board>`)}`,
  )
  await writeFile(
    join(cwd, "missing-tools.json"),
    JSON.stringify({
      fasthenry: process.execPath,
      fastercap: process.execPath,
      ngspice: process.execPath,
    }),
  )
  const missingModeling = await run(["no-modeling.tsx"], { mockSolvers: false })
  expect(missingModeling.exitCode).not.toBe(0)
  expect(missingModeling.stderr).toContain("Export modeling")
}, 30000)

test("ngspice Circuit JSON stays on the existing engine and rejects report flags", async () => {
  const { cwd, run } = await fixture()
  await writeFile(join(cwd, "empty.json"), "[]")
  const result = await run(["empty.json", "--open"])
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain(
    '--open and --output require spiceEngine="pcb_spice"',
  )
  expect(await Bun.file(join(cwd, "opened.json")).exists()).toBe(false)
})
