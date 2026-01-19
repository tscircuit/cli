import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat, mkdir, readdir } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
import { SmdUsbC } from "@tsci/seveibar.smd-usb-c"

export default () => (
  <board width="30mm" height="30mm">
    <SmdUsbC name="J1" pcbX={0} pcbY={0} />
  </board>
)`

test("build with tsci import", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath}`)

  const content = await readFile(
    path.join(tmpDir, "dist", "test-circuit", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(content)
  const component = json.find((c: any) => c.ftype === "simple_chip")
  expect(component.name).toBe("J1")
}, 30_000)
