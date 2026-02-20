import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, mkdir } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"

test("build --kicad-library --kicad-library-name generates KiCad library with custom name", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create lib directory with a component
  await mkdir(path.join(tmpDir, "lib"), { recursive: true })

  const componentCode = `
const KeySocket = () => (
  <chip
    name="REF**"
    kicadSymbolMetadata={{
      pinNumbers: {
        hide: true,
      },
      pinNames: {
        hide: true,
        offset: 2.54,
      },
      properties: {
        Reference: {
          value: "SW",
        },
        Value: {
          value: "MX_SWITCH",
        },
        Description: {
          value: "Cherry MX switch symbol",
        },
      },
    }}
    symbol={
      <symbol name="KeySocket">
        <schematicpath
          strokeWidth={0.05}
          points={[
            { x: -0.3, y: -0.2 },
            { x: 0.3, y: -0.2 },
            { x: 0.3, y: 0.2 },
            { x: -0.3, y: 0.2 },
            { x: -0.3, y: -0.2 },
          ]}
        />
        <port name="pin1" direction="left" schX={-0.4} schY={0} />
        <port name="pin2" direction="right" schX={0.4} schY={0} />
      </symbol>
    }
    footprint={
      <footprint>
        <smtpad
          shape="rect"
          width="2.5mm"
          height="1.2mm"
          portHints={["pin1"]}
          pcbX={-3.81}
          pcbY={2.54}
        />
        <smtpad
          shape="rect"
          width="2.5mm"
          height="1.2mm"
          portHints={["pin2"]}
          pcbX={2.54}
          pcbY={5.08}
        />
        <hole pcbX={0} pcbY={0} diameter="4mm" />
        <silkscreentext text="SW" pcbY={8} fontSize="1mm" />
      </footprint>
    }
    cadModel={{
      stlUrl: "/path/to/CherryMxSwitch.step",
      rotationOffset: { x: 0, y: 0, z: 0 },
    }}
    pinLabels={{ pin1: "1", pin2: "2" }}
  />
)

export const KeyHotSocket = () => (
  <board width="20mm" height="20mm">
    <KeySocket />
  </board>
)
`

  await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-kicad-library-name",
      version: "1.0.0",
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./lib/index.tsx",
      kicadLibraryName: "nut kar",
    }),
  )

  await runCommand("tsci install")

  await runCommand(
    "tsci build --kicad-library --kicad-library-name custom-my-lib",
  )

  const kicadLibDir = path.join(tmpDir, "dist", "kicad-library")
  expect(fs.existsSync(kicadLibDir)).toBe(true)

  const files = await readdir(kicadLibDir, { recursive: true })
  const fileList = files.map((f) => f.toString())
  expect(fileList.some((f) => f.includes("symbols"))).toBe(true)
  expect(fileList.some((f) => f.includes("footprints"))).toBe(true)
  expect(
    fileList.some(
      (f) =>
        f.startsWith("symbols") && path.basename(f).startsWith("custom-my-lib"),
    ),
  ).toBe(true)
})
