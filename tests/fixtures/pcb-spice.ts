import { mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"

export const pcbSpiceBoard = `
  <board width={10} height={10} routingDisabled schematicDisabled>
    <chip name="U1" pinLabels={{pin1: "DATA", pin2: "GND", pin3: "VCC"}} footprint="sot23" />
  </board>`
export const pcbSpiceDeclarations = `
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

export const pcbSpiceEntry = `import { analog } from "@tscircuit/core"
export const modeling = {description: "CLI native declarations"}
export default () => ${pcbSpiceBoard.replace("</board>", `${pcbSpiceDeclarations}</board>`)}`

export const getPcbSpiceFixture = async (entry = pcbSpiceEntry) => {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "tsci-pcb-spice-")))
  globalThis.deferredCleanupFns.push(() =>
    rm(cwd, { recursive: true, force: true }),
  )
  await symlink(resolve("node_modules"), join(cwd, "node_modules"), "junction")
  await writeFile(join(cwd, "package.json"), '{"type":"module"}')
  await writeFile(join(cwd, "entry.tsx"), entry)
  await writeFile(
    join(cwd, "tools.json"),
    JSON.stringify({
      fasthenry: process.execPath,
      fastercap: process.execPath,
      ngspice: process.execPath,
    }),
  )
  return cwd
}

export const runPcbSpiceCli = async ({
  cwd,
  args = ["entry.tsx"],
  mockPipeline = true,
  fail = false,
}: {
  cwd: string
  args?: string[]
  mockPipeline?: boolean
  fail?: boolean
}) => {
  const child = Bun.spawn(
    [
      process.execPath,
      "--preload",
      resolve("tests/fixtures/pcb-spice-preload.ts"),
      resolve("tests/fixtures/pcb-spice-cli.ts"),
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
        TSCIRCUIT_CONFIG_DIR: join(cwd, ".config"),
        PCB_SPICE_TOOLS: join(cwd, "tools.json"),
        PCB_SPICE_MOCK_PIPELINE: String(mockPipeline),
        PCB_SPICE_FAIL_PIPELINE: String(fail),
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

export const readPcbSpiceReceipt = async (
  directory: string,
): Promise<{
  circuitJson: AnyCircuitElement[]
  modeling: Record<string, unknown>
  project: { root: string }
}> => Bun.file(join(directory, "receipt.json")).json()
