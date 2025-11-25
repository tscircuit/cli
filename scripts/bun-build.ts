import { extname, basename } from "node:path"
// @ts-ignore
import tscircuitPackageJson from "tscircuit/package.json"

const tscircuitPackageJsonDeps = Object.keys(tscircuitPackageJson.dependencies)

const ALLOW_BUNDLING = ["@tscircuit/runframe"]

const result = await Bun.build({
  entrypoints: ["./cli/main.ts"],
  target: "node",
  outdir: "./dist",
  external: [
    ...tscircuitPackageJsonDeps.filter((dep) => !ALLOW_BUNDLING.includes(dep)),
    "zod",
    "looks-same",
    "sharp",
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

export {}
