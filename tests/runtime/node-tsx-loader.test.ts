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
}, 20_000)

test("registerStaticAssetLoaders loads .tsx, .ts, .cts, .json, tsconfig paths, and static assets under Node without Bun", async () => {
  const root = await mkdtemp(join(tmpdir(), "tsci-node-tsx-loader-"))
  try {
    const loaderSource = await Bun.file(
      resolve("lib/shared/register-static-asset-loaders.ts"),
    ).text()
    const transpiledLoader = ts.transpileModule(loaderSource, {
      fileName: "register-static-asset-loaders.ts",
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    }).outputText

    await mkdir(join(root, "src/helpers"), { recursive: true })
    await mkdir(join(root, "node_modules/mock-dep/assets"), { recursive: true })

    const loaderModulePath = join(root, "register-static-asset-loaders.mjs")
    await writeFile(loaderModulePath, transpiledLoader)
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ private: true, type: "module" }),
    )
    await writeFile(
      join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@helpers/*": ["src/helpers/*"],
          },
        },
      }),
    )
    await writeFile(
      join(root, "values.json"),
      JSON.stringify({ resistance: "4.7k" }),
    )
    await writeFile(join(root, "legacy.cts"), `export const tolerance = "1%"\n`)
    await writeFile(
      join(root, "src/helpers/part-name.ts"),
      `export const partName: string = "R1"\n`,
    )
    await writeFile(
      join(root, "node_modules/mock-dep/assets/model.step"),
      "ISO-10303-21;",
    )
    await writeFile(join(root, "sample.kicad_pcb"), "(kicad_pcb)")
    await writeFile(
      join(root, "index.circuit.tsx"),
      [
        `import { partName } from "@helpers/part-name"`,
        `import { tolerance } from "./legacy.cjs"`,
        `import values from "./values.json"`,
        `import stepPath from "./node_modules/mock-dep/assets/model.step"`,
        `import pcbDefault, { Board, circuitJson } from "./sample.kicad_pcb"`,
        `export default () => (`,
        `  <board width="10mm" height="10mm" stepPath={stepPath} tolerance={tolerance} boardName={Board()} count={circuitJson.length} defaultCount={pcbDefault.length}>`,
        `    <resistor name={partName} resistance={values.resistance} footprint="0402" />`,
        `  </board>`,
        `)`,
      ].join("\n"),
    )

    const driverPath = join(root, "driver.mjs")
    await writeFile(
      driverPath,
      [
        `import { registerStaticAssetLoaders } from ${JSON.stringify(pathToFileURL(loaderModulePath).href)}`,
        `globalThis.React = {`,
        `  createElement(type, props, ...children) {`,
        `    return { type, props, children }`,
        `  },`,
        `}`,
        `const platformConfig = {`,
        `  staticFileLoaderMap: {`,
        `    kicad_pcb: async () => ({`,
        `      __esModule: true,`,
        `      default: [{ type: "pcb_board" }],`,
        `      Board: () => "ImportedBoard",`,
        `      boardContentCircuitJson: [],`,
        `      circuitJson: [{ type: "pcb_board" }],`,
        `    }),`,
        `  },`,
        `}`,
        `registerStaticAssetLoaders(platformConfig, ${JSON.stringify(root)})`,
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
      props: {
        width: "10mm",
        height: "10mm",
        stepPath: "./node_modules/mock-dep/assets/model.step",
        tolerance: "1%",
        boardName: "ImportedBoard",
        count: 1,
        defaultCount: 1,
      },
      children: [
        {
          type: "resistor",
          props: {
            name: "R1",
            resistance: "4.7k",
            footprint: "0402",
          },
          children: [],
        },
      ],
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 20_000)

test("registerStaticAssetLoaders preserves initial working-directory base for static asset URLs while updating active project dir for tsconfig paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "tsci-node-reinit-loader-"))
  try {
    const loaderSource = await Bun.file(
      resolve("lib/shared/register-static-asset-loaders.ts"),
    ).text()
    const transpiledLoader = ts.transpileModule(loaderSource, {
      fileName: "register-static-asset-loaders.ts",
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    }).outputText

    const loaderModulePath = join(root, "register-static-asset-loaders.mjs")
    await writeFile(loaderModulePath, transpiledLoader)

    const linkedLibDir = join(root, "aliased-glb-lib/dist/assets")
    const consumerDir = join(root, "aliased-glb-consumer")
    await mkdir(linkedLibDir, { recursive: true })
    await mkdir(join(consumerDir, "src"), { recursive: true })

    await writeFile(join(linkedLibDir, "chip.glb"), "glTF")
    await writeFile(
      join(consumerDir, "package.json"),
      JSON.stringify({ private: true, type: "module" }),
    )
    await writeFile(
      join(consumerDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@consumer/*": ["src/*"],
          },
        },
      }),
    )
    await writeFile(
      join(consumerDir, "src/label.ts"),
      `export const chipName: string = "U1"\n`,
    )
    await writeFile(
      join(consumerDir, "index.tsx"),
      [
        `import { chipName } from "@consumer/label"`,
        `import glbUrl from "../aliased-glb-lib/dist/assets/chip.glb"`,
        `export default () => ({ chipName, glbUrl })`,
      ].join("\n"),
    )

    const driverPath = join(root, "driver.mjs")
    await writeFile(
      driverPath,
      [
        `import { registerStaticAssetLoaders } from ${JSON.stringify(pathToFileURL(loaderModulePath).href)}`,
        `registerStaticAssetLoaders(undefined, ${JSON.stringify(root)})`,
        `registerStaticAssetLoaders({}, ${JSON.stringify(consumerDir)})`,
        `const mod = await import(${JSON.stringify(pathToFileURL(join(consumerDir, "index.tsx")).href)})`,
        `console.log(JSON.stringify(mod.default()))`,
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
    expect(JSON.parse(stdout.trim())).toEqual({
      chipName: "U1",
      glbUrl: "./aliased-glb-lib/dist/assets/chip.glb",
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 20_000)
