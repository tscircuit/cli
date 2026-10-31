import { expect, test } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { temporaryDirectory } from "tempy"

test("generateCircuitJson loads CJS registry packages that require('@tscircuit/core')", async () => {
  const tmpDir = temporaryDirectory()
  globalThis.deferredCleanupFns.push(() =>
    rm(tmpDir, { recursive: true, force: true }),
  )

  const pkgDir = path.join(
    tmpDir,
    "node_modules",
    "@tsci",
    "Anshgrover23.AMS1117_3_3",
  )
  await mkdir(pkgDir, { recursive: true })

  await writeFile(
    path.join(pkgDir, "package.json"),
    JSON.stringify(
      {
        name: "@tsci/Anshgrover23.AMS1117_3_3",
        version: "0.0.1",
        main: "./index.cjs",
      },
      null,
      2,
    ),
  )

  await writeFile(
    path.join(pkgDir, "index.cjs"),
    [
      "var core = require('@tscircuit/core');",
      "var jsxRuntime = require('react/jsx-runtime');",
      "exports.AMS1117_3_3 = function AMS1117_3_3(props) {",
      "  if (typeof core.createUseComponent !== 'function') {",
      "    throw new Error('Expected createUseComponent from @tscircuit/core');",
      "  }",
      "  return jsxRuntime.jsx('resistor', { name: props.name || 'U1', resistance: '1k', footprint: '0402' });",
      "};",
    ].join("\n"),
  )

  const circuitPath = path.join(tmpDir, "index.circuit.tsx")
  await writeFile(
    circuitPath,
    [
      'import { AMS1117_3_3 } from "@tsci/Anshgrover23.AMS1117_3_3"',
      "",
      "export default function CjsRegistryCircuit() {",
      "  const React = (globalThis as any).React",
      '  return React.createElement("board", { width: "10mm", height: "10mm" }, React.createElement(AMS1117_3_3, { name: "U1" }))',
      "}",
    ].join("\n"),
  )

  const { circuitJson } = await generateCircuitJson({
    filePath: circuitPath,
    projectDir: tmpDir,
  })

  expect(
    circuitJson.some(
      (elm: any) => elm.type === "source_component" && elm.name === "U1",
    ),
  ).toBe(true)
})
