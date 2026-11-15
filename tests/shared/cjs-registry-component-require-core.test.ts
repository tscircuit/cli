import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

test("generateCircuitJson loads CJS registry packages that require('@tscircuit/core')", async () => {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "tsci-cjs-core-bridge-"),
  )

  try {
    const pkgDir = path.join(
      tmpDir,
      "node_modules",
      "@tsci",
      "Anshgrover23.AMS1117_3_3",
    )
    await fs.mkdir(pkgDir, { recursive: true })

    await fs.writeFile(
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

    await fs.writeFile(
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
    await fs.writeFile(
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
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}, 30_000)
