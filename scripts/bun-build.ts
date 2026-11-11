import { basename } from "node:path"
import { cp } from "node:fs/promises"
import { fileURLToPath } from "node:url"
// @ts-ignore
import tscircuitPackageJson from "tscircuit/package.json"

const tscircuitPackageJsonDeps = Object.keys(tscircuitPackageJson.dependencies)

const ALLOW_BUNDLING = [
  // Keep compiler consumers in the CLI bundle so their TypeScript imports
  // resolve to the CLI's compatible dependency, not the project's compiler.
  "@rollup/plugin-typescript",
  "rollup-plugin-dts",
  "@tscircuit/runframe",
  "calculate-elbow",
  "poppygl",
  "circuit-json-to-pnp-csv",
]

const makeVfsShimPath = fileURLToPath(
  new URL("../lib/utils/make-vfs.ts", import.meta.url),
)

const result = await Bun.build({
  entrypoints: [
    "./cli/main.ts",
    "./cli/build/build.worker.ts",
    "./cli/snapshot/snapshot.worker.ts",
    "./lib/index.ts",
  ],
  target: "node",
  outdir: "./dist",
  plugins: [
    {
      name: "replace-bundled-make-vfs",
      setup(build) {
        // Redirect direct and transitive `make-vfs` imports (e.g. via winterspec)
        // to the native fs/promises implementation so pre-bundled glob/minimatch/
        // brace-expansion copies with advisories are not shipped in dist/*.
        build.onResolve({ filter: /^make-vfs$/ }, () => ({
          path: makeVfsShimPath,
        }))
      },
    },
  ],
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
