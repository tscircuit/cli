import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat, copyFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
import { Board } from "./example-resistors.kicad_pcb"

export default () => (
  <Board />
)`

const kicadPcbPath = path.join(
  __dirname,
  "../assets/example-resistors.kicad_pcb",
)

test("build with kicad pcb import outputs the circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "kicad-pcb-import.tsx")
  await writeFile(circuitPath, circuitCode)
  await copyFile(kicadPcbPath, path.join(tmpDir, "example-resistors.kicad_pcb"))
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath}`)

  const data = await readFile(
    path.join(tmpDir, "dist", "kicad-pcb-import", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")
}, 30_000)
