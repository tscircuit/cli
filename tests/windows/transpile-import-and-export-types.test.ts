import { expect, test } from "bun:test"
import { mkdir, writeFile, readFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

const windowsTest = process.platform === "win32" ? test : test.skip

const typesFile = `
export type BoardSize = {
  width: string
  height: string
}
export type ResistorFootprint = "0402" | "0603"
`

const helperFile = `
import type { BoardSize } from "./types"
export const createBoardSize = (width: string, height: string): BoardSize => ({
  width,
  height,
})
`

const resistorFile = `
import React from "react"
import type { ResistorFootprint } from "../types"
export type ResistorProps = {
  name: string
  resistance: string
  footprint: ResistorFootprint
}
const ResistorComponent = ({ name, resistance, footprint }: ResistorProps) => (
  <resistor
    name={name}
    resistance={resistance}
    footprint={footprint}
    schX={4}
    schY={4}
    pcbX={4}
    pcbY={4}
  />
)
export default ResistorComponent
`

const indexFile = `
import React from "react"
import ResistorComponent, { type ResistorProps } from "./components/resistor"
import { createBoardSize } from "./helpers"
import type { BoardSize } from "./types"
export type ExportedBoardSize = BoardSize
export const exportedFootprint: ResistorProps["footprint"] = "0402"
const ExampleCircuit = () => {
  const size: BoardSize = createBoardSize("40mm", "25mm")
  return (
    <board width={size.width} height={size.height}>
      <ResistorComponent name="R1" resistance="1k" footprint="0402" />
    </board>
  )
}
export default ExampleCircuit
`

windowsTest(
  "tsci transpile handles import/export type statements on Windows",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const srcDir = path.join(tmpDir, "src")
    await mkdir(path.join(srcDir, "components"), { recursive: true })

    await writeFile(path.join(srcDir, "types.ts"), typesFile)
    await writeFile(path.join(srcDir, "helpers.ts"), helperFile)
    await writeFile(
      path.join(srcDir, "components", "resistor.tsx"),
      resistorFile,
    )
    await writeFile(path.join(srcDir, "index.tsx"), indexFile)
    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "windows-transpile-test", main: "dist/index.js" }),
    )

    const entryFile = path.join(srcDir, "index.tsx")
    await runCommand(`tsci transpile ${entryFile}`)

    const esmContent = await readFile(
      path.join(tmpDir, "dist", "index.js"),
      "utf-8",
    )
    expect(esmContent).toMatch(/export.*exportedFootprint/)
    expect(esmContent).toContain("createBoardSize")

    const dtsContent = await readFile(
      path.join(tmpDir, "dist", "index.d.ts"),
      "utf-8",
    )
    expect(dtsContent).toMatch(/export.*ExportedBoardSize/)
    expect(dtsContent).toMatch(/export.*exportedFootprint/)
  },
  120_000,
)
