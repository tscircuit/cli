import { basename } from "node:path"
import { cp } from "node:fs/promises"
import { fileURLToPath } from "node:url"
// @ts-ignore
import tscircuitPackageJson from "tscircuit/package.json"

const tscircuitPackageJsonDeps = Object.keys(tscircuitPackageJson.dependencies)

const ALLOW_BUNDLING = [
  "@tscircuit/runframe",
  "calculate-elbow",
  "poppygl",
  "circuit-json-to-pnp-csv",
]

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

// Palace's bundled orchestration resolves these scripts beside main.js.
await cp(
  fileURLToPath(
    new URL("./python/", import.meta.resolve("simulate-return-current/palace")),
  ),
  "./dist/cli/python",
  { recursive: true },
)

for (const output of outputs) {
  console.log(
    `${basename(output.path)} ${(output.size / 1024 / 1024).toFixed(2)} MB`,
  )
}

export {}
