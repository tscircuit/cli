import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const componentFile = `
export default ({
  resistorName = "R1",
}: {
  resistorName?: string
}) => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name={resistorName} schX={3} pcbX={3} />
  </board>
)
`

test("build --inject-props injects props into default export", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const filePath = path.join(tmpDir, "with-props.circuit.tsx")

  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(filePath, componentFile)

  const { exitCode } = await runCommand(
    'tsci build --inject-props {"resistorName":"R9"} with-props.circuit.tsx',
  )

  expect(exitCode).toBeOneOf([0, 2])

  const outputPath = path.join(tmpDir, "dist", "with-props", "circuit.json")
  const circuitJson = JSON.parse(await readFile(outputPath, "utf-8"))
  const sourceComponent = circuitJson.find(
    (el: any) => el.type === "source_component",
  )

  expect(sourceComponent?.name).toBe("R9")
}, 30_000)

test("build --inject-props-file injects props from file", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const filePath = path.join(tmpDir, "with-props-file.circuit.tsx")
  const configDir = path.join(tmpDir, "config")

  await mkdir(configDir, { recursive: true })
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(filePath, componentFile)
  await writeFile(
    path.join(configDir, "props.json"),
    JSON.stringify({ resistorName: "R10" }),
  )

  const { exitCode } = await runCommand(
    "tsci build --inject-props-file ./config/props.json with-props-file.circuit.tsx",
  )

  expect(exitCode).toBeOneOf([0, 2])

  const outputPath = path.join(
    tmpDir,
    "dist",
    "with-props-file",
    "circuit.json",
  )
  const circuitJson = JSON.parse(await readFile(outputPath, "utf-8"))
  const sourceComponent = circuitJson.find(
    (el: any) => el.type === "source_component",
  )

  expect(sourceComponent?.name).toBe("R10")
}, 30_000)
