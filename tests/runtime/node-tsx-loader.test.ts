import { expect, test } from "bun:test"
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const nodeExecutable = Bun.which("node") ?? "node"

test("entrypoint falls back to current Node process when neither bun nor tsx is on PATH", async () => {
  const root = await mkdtemp(join(tmpdir(), "tsci-node-entrypoint-"))
  try {
    const packageRoot = join(root, "pkg")
    await mkdir(join(packageRoot, "cli"), { recursive: true })
    await mkdir(join(packageRoot, "dist/cli"), { recursive: true })
    for (const file of ["entrypoint.js", "node-runtime.js"]) {
      await copyFile(resolve("cli", file), join(packageRoot, "cli", file))
    }
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({ type: "module", version: "0.0.0" }),
    )
    await writeFile(
      join(packageRoot, "dist/cli/main.js"),
      `console.log(JSON.stringify({ args: process.argv.slice(2), runtime: typeof Bun === "undefined" ? "node" : "bun" }))`,
    )

    const child = Bun.spawn(
      [
        nodeExecutable,
        join(packageRoot, "cli/entrypoint.js"),
        "--use-global",
        "--version",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH: "",
          Path: "",
          TSCIRCUIT_NODE_RUNTIME: undefined,
          TSCIRCUIT_NODE_RUNTIME_ARGS: undefined,
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    )

    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])

    expect(code, stderr).toBe(0)
    expect(JSON.parse(stdout.trim())).toEqual({
      args: ["--version"],
      runtime: "node",
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("registerStaticAssetLoaders enables Node to import .tsx, extensionless .ts, .json, and static assets without Bun", async () => {
  const root = await mkdtemp(join(tmpdir(), "tsci-node-tsx-loader-"))
  try {
    const loaderTsSource = await Bun.file(
      resolve("lib/shared/register-static-asset-loaders.ts"),
    ).text()
    const transpiledLoader = ts.transpileModule(loaderTsSource, {
      fileName: "register-static-asset-loaders.ts",
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    }).outputText

    const loaderMjsPath = join(root, "register-static-asset-loaders.mjs")
    await writeFile(loaderMjsPath, transpiledLoader)

    await writeFile(
      join(root, "values.ts"),
      `export const resistanceValue: string = "1k"\n`,
    )
    await writeFile(
      join(root, "meta.json"),
      JSON.stringify({ boardWidth: "10mm", boardHeight: "10mm" }),
    )
    await writeFile(join(root, "part.kicad_mod"), `(footprint "R_0402")`)
    await writeFile(
      join(root, "index.circuit.tsx"),
      [
        `import { resistanceValue } from "./values"`,
        `import meta from "./meta.json"`,
        `import footprintPath from "./part.kicad_mod"`,
        `export default () => (`,
        `  <board width={meta.boardWidth} height={meta.boardHeight}>`,
        `    <resistor name="R1" resistance={resistanceValue} footprint={footprintPath} />`,
        `  </board>`,
        `)`,
      ].join("\n"),
    )

    const driverPath = join(root, "driver.mjs")
    await writeFile(
      driverPath,
      [
        `import { registerStaticAssetLoaders } from ${JSON.stringify(pathToFileURL(loaderMjsPath).href)}`,
        `globalThis.React = {`,
        `  createElement: (type, props, ...children) => ({ type, props, children }),`,
        `}`,
        `registerStaticAssetLoaders(undefined, ${JSON.stringify(root)})`,
        `const mod = await import(${JSON.stringify(pathToFileURL(join(root, "index.circuit.tsx")).href)})`,
        `console.log(JSON.stringify({ isBun: typeof Bun !== "undefined", tree: mod.default() }))`,
      ].join("\n"),
    )

    const child = Bun.spawn([nodeExecutable, driverPath], {
      cwd: root,
      env: {
        ...process.env,
        NODE_PATH: resolve("node_modules"),
      },
      stdout: "pipe",
      stderr: "pipe",
    })

    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])

    expect(code, stderr).toBe(0)
    const parsed = JSON.parse(stdout.trim())
    expect(parsed.isBun).toBe(false)
    expect(parsed.tree).toEqual({
      type: "board",
      props: { width: "10mm", height: "10mm" },
      children: [
        {
          type: "resistor",
          props: {
            name: "R1",
            resistance: "1k",
            footprint: "./part.kicad_mod",
          },
          children: [],
        },
      ],
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
