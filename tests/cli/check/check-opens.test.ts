import { expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import { symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { checkOpens } from "../../../cli/check/opens/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// ignoreNets shipped in @tscircuit/check-shorts after 0.0.19. Feature-detect
// against the resolved package's typings (an unsupported option is silently
// ignored at runtime, so a runtime probe can't tell) — the suppression test
// activates once the pinned dependency is bumped.
const checkShortsSupportsIgnoreNets = (() => {
  try {
    // The package exposes only an ESM "import" export, so resolve via ESM.
    // index.d.ts is re-exports only, so scan every .d.ts beside the entry.
    const entryPath = fileURLToPath(
      import.meta.resolve("@tscircuit/check-shorts"),
    )
    const distDir = path.dirname(entryPath)
    return readdirSync(distDir)
      .filter((name) => name.endsWith(".d.ts"))
      .some((name) =>
        readFileSync(path.join(distDir, name), "utf8").includes("ignoreNets"),
      )
  } catch {
    return false
  }
})()

// The circuit is evaluated from the temp dir, so it needs the workspace's
// node_modules to resolve react/tscircuit (same approach as check-shorts.test).
const linkWorkspaceNodeModules = async (tmpDir: string) => {
  await symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
}

// routingDisabled leaves the trace declared but unrouted — no copper joins the
// two pads. That is precisely the failure mode `check opens` exists to catch:
// the build succeeds, no short exists, and the board is dead.
const unroutedCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

const routedCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test("check opens detects a net that was never routed", async () => {
  const { tmpDir } = await getCliTestFixture()
  await linkWorkspaceNodeModules(tmpDir)
  const circuitPath = path.join(tmpDir, "unrouted.circuit.tsx")
  await writeFile(circuitPath, unroutedCircuitCode)

  const result = await checkOpens(circuitPath, { mode: "pcb", layer: "top" })

  expect(result.opens.length).toBeGreaterThan(0)
  expect(result.output).toContain("Detected")
})

test("check opens reports nothing for a fully routed board", async () => {
  const { tmpDir } = await getCliTestFixture()
  await linkWorkspaceNodeModules(tmpDir)
  const circuitPath = path.join(tmpDir, "routed.circuit.tsx")
  await writeFile(circuitPath, routedCircuitCode)

  const result = await checkOpens(circuitPath, { mode: "pcb", layer: "top" })

  expect(result.opens).toHaveLength(0)
  expect(result.output).toContain("No opens detected")
})

// Two mounting holes on net.CHASSIS, joined by the metal enclosure rather than
// board copper. The split is real on the copper, so it flags by default;
// --ignore-net CHASSIS is the declared "joined off-board" escape hatch.
const chassisCircuitCode = `
export default () => (
  <board width="30mm" height="30mm" routingDisabled>
    <chip
      name="H1"
      footprint={
        <footprint>
          <platedhole portHints={["pin1"]} pcbX="0mm" pcbY="0mm" shape="circle" holeDiameter="3mm" outerDiameter="5mm" />
        </footprint>
      }
      connections={{ pin1: "net.CHASSIS" }}
    />
    <chip
      name="H2"
      footprint={
        <footprint>
          <platedhole portHints={["pin1"]} pcbX="10mm" pcbY="10mm" shape="circle" holeDiameter="3mm" outerDiameter="5mm" />
        </footprint>
      }
      connections={{ pin1: "net.CHASSIS" }}
    />
  </board>
)
`

test("check opens flags an enclosure-joined net by default", async () => {
  const { tmpDir } = await getCliTestFixture()
  await linkWorkspaceNodeModules(tmpDir)
  const circuitPath = path.join(tmpDir, "chassis.circuit.tsx")
  await writeFile(circuitPath, chassisCircuitCode)

  const result = await checkOpens(circuitPath, { mode: "pcb" })

  expect(result.opens.length).toBeGreaterThan(0)
})

test.skipIf(!checkShortsSupportsIgnoreNets)(
  "check opens silences a net listed via --ignore-net",
  async () => {
    const { tmpDir } = await getCliTestFixture()
    await linkWorkspaceNodeModules(tmpDir)
    const circuitPath = path.join(tmpDir, "chassis-ignored.circuit.tsx")
    await writeFile(circuitPath, chassisCircuitCode)

    const result = await checkOpens(circuitPath, {
      mode: "pcb",
      ignoreNet: ["CHASSIS"],
    })

    expect(result.opens).toHaveLength(0)
    expect(result.output).toContain("No opens detected")
  },
)

test("--ignore-net for an unrelated net does not mask a real open", async () => {
  const { tmpDir } = await getCliTestFixture()
  await linkWorkspaceNodeModules(tmpDir)
  const circuitPath = path.join(tmpDir, "unrouted-ignored.circuit.tsx")
  await writeFile(circuitPath, unroutedCircuitCode)

  const result = await checkOpens(circuitPath, {
    mode: "pcb",
    layer: "top",
    ignoreNet: ["CHASSIS"],
  })

  expect(result.opens.length).toBeGreaterThan(0)
})
