import { copyFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { basename, dirname, join } from "node:path"
// @ts-ignore
import tscircuitPackageJson from "tscircuit/package.json"

const tscircuitPackageJsonDeps = Object.keys(tscircuitPackageJson.dependencies)

const ALLOW_BUNDLING = ["@tscircuit/runframe"]

const result = await Bun.build({
  entrypoints: [
    "./cli/main.ts",
    "./cli/build/build.worker.ts",
    "./cli/snapshot/snapshot.worker.ts",
    "./lib/index.ts",
  ],
  target: "node",
  outdir: "./dist",
  external: [
    ...tscircuitPackageJsonDeps.filter((dep) => !ALLOW_BUNDLING.includes(dep)),
    "zod",
    "tscircuit",
    "typescript",
    "circuit-to-svg",
    "@types/*",
    "react",
    "react-dom",
    "react-reconciler",
  ],
})

const { outputs, success } = result

if (!success) {
  console.error("Build failed", result.logs)
  process.exit(1)
}

for (const output of outputs) {
  console.log(
    `${basename(output.path)} ${(output.size / 1024 / 1024).toFixed(2)} MB`,
  )
}

const require = createRequire(import.meta.url)
const manifoldWasmSourcePath = require.resolve(
  "@tscircuit/manifold-2d/manifold.wasm",
)
const manifoldWasmOutputPath = join(
  process.cwd(),
  "dist",
  "cli",
  "manifold.wasm",
)

await mkdir(dirname(manifoldWasmOutputPath), { recursive: true })
await copyFile(manifoldWasmSourcePath, manifoldWasmOutputPath)

export {}
