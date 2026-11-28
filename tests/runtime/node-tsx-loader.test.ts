import { expect, test } from "bun:test"
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const nodeExecutable = Bun.which("node") ?? "node"
const nodeOnlyPath = dirname(nodeExecutable)

function createNodeOnlyEnv() {
  return {
    ...process.env,
    PATH: nodeOnlyPath,
    Path: nodeOnlyPath,
    TSCIRCUIT_NODE_RUNTIME: undefined,
    TSCIRCUIT_NODE_RUNTIME_ARGS: undefined,
  }
}

test("entrypoint falls back to current Node process when bun and tsx are absent", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "tsci-node-entrypoint-"))
  try {
    const pkgRoot = join(tempRoot, "pkg")
    mkdirSync(join(pkgRoot, "cli"), { recursive: true })
    mkdirSync(join(pkgRoot, "dist", "cli"), { recursive: true })
    copyFileSync(
      resolve("cli", "entrypoint.js"),
      join(pkgRoot, "cli", "entrypoint.js"),
    )
    copyFileSync(
      resolve("cli", "node-runtime.js"),
      join(pkgRoot, "cli", "node-runtime.js"),
    )
    writeFileSync(
      join(pkgRoot, "package.json"),
      JSON.stringify({
        name: "@tscircuit/cli",
        type: "module",
        version: "0.0.0",
      }),
    )
    writeFileSync(
      join(pkgRoot, "dist", "cli", "main.js"),
      "console.log(JSON.stringify({ runtime: process.release.name, argv: process.argv.slice(2) }))\n",
    )

    const result = Bun.spawnSync(
      [
        nodeExecutable,
        join(pkgRoot, "cli", "entrypoint.js"),
        "--use-global",
        "--version",
      ],
      {
        cwd: tempRoot,
        env: createNodeOnlyEnv(),
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const stdoutText = new TextDecoder().decode(result.stdout)
    const stderrText = new TextDecoder().decode(result.stderr)

    expect(result.exitCode, stderrText).toBe(0)
    expect(JSON.parse(stdoutText)).toEqual({
      runtime: "node",
      argv: ["--version"],
    })
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("Node loader executes .tsx circuits with extensionless imports, baseUrl, and static assets", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "tsci-node-tsx-loader-"))
  try {
    symlinkSync(
      resolve("node_modules"),
      join(tempRoot, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    )
    mkdirSync(join(tempRoot, "shared"), { recursive: true })
    mkdirSync(join(tempRoot, "dist"), { recursive: true })

    const bundleResult = await Bun.build({
      entrypoints: [
        resolve("lib", "shared", "register-static-asset-loaders.ts"),
      ],
      outdir: join(tempRoot, "dist"),
      target: "node",
      external: ["typescript", "@tscircuit/props"],
    })
    expect(bundleResult.success).toBe(true)

    writeFileSync(
      join(tempRoot, "package.json"),
      JSON.stringify({
        name: "node-tsx-fixture",
        type: "module",
        version: "0.0.0",
      }),
    )
    writeFileSync(
      join(tempRoot, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { baseUrl: "." } }),
    )
    writeFileSync(
      join(tempRoot, "shared", "helper.ts"),
      'export const R_OHMS = "4.7k"\n',
    )
    writeFileSync(join(tempRoot, "model.step"), "ISO-10303-21;\n")
    writeFileSync(
      join(tempRoot, "child-part.tsx"),
      `import { R_OHMS } from "shared/helper"
import stepAssetPath from "./model.step"

export const loadedStepAssetPath = stepAssetPath
export const ChildPart = () => (
  <resistor name="R1" resistance={R_OHMS} footprint="0402" />
)
`,
    )
    writeFileSync(
      join(tempRoot, "index.circuit.tsx"),
      `import { ChildPart, loadedStepAssetPath } from "./child-part"

export const resolvedStepPath = loadedStepAssetPath
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <ChildPart />
  </board>
)
`,
    )

    const loaderUrl = JSON.stringify(
      pathToFileURL(join(tempRoot, "dist", "register-static-asset-loaders.js"))
        .href,
    )
    const circuitUrl = JSON.stringify(
      pathToFileURL(join(tempRoot, "index.circuit.tsx")).href,
    )
    const projectDirLiteral = JSON.stringify(tempRoot)
    writeFileSync(
      join(tempRoot, "run-node-circuit.mjs"),
      `import React from "react"
import { RootCircuit } from "tscircuit"
import { registerStaticAssetLoaders } from ${loaderUrl}

globalThis.React = React
registerStaticAssetLoaders(undefined, ${projectDirLiteral})
const mod = await import(${circuitUrl})
const circuit = new RootCircuit()
circuit.add(React.createElement(mod.default))
await circuit.renderUntilSettled()
console.log(JSON.stringify({
  components: circuit.db.source_component.list().length,
  stepPath: mod.resolvedStepPath,
}))
`,
    )

    const result = Bun.spawnSync(
      [nodeExecutable, join(tempRoot, "run-node-circuit.mjs")],
      {
        cwd: tempRoot,
        env: createNodeOnlyEnv(),
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const stdoutText = new TextDecoder().decode(result.stdout)
    const stderrText = new TextDecoder().decode(result.stderr)

    expect(result.exitCode, stderrText).toBe(0)
    expect(JSON.parse(stdoutText)).toEqual({
      components: 1,
      stepPath: "./model.step",
    })
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})
