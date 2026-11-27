import { basename, join } from "node:path"
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
  new URL("../lib/shared/make-vfs.ts", import.meta.url),
)

export async function buildCli({
  outdir = "./dist",
  copyPythonAssets = true,
  silent = false,
}: {
  outdir?: string
  copyPythonAssets?: boolean
  silent?: boolean
} = {}) {
  const result = await Bun.build({
    entrypoints: [
      "./cli/main.ts",
      "./cli/build/build.worker.ts",
      "./cli/snapshot/snapshot.worker.ts",
      "./lib/index.ts",
    ],
    target: "node",
    outdir,
    // The drawing renderer requires a newer schema than the project's tscircuit.
    // Bundle its private copy and keep other imports on the project schema.
    plugins: [
      {
        name: "drawing-schema",
        setup(build) {
          build.onResolve({ filter: /^circuit-json$/ }, ({ importer }) =>
            /[/\\]@tscircuit[/\\]circuit-json-to-drawing[/\\]/.test(importer)
              ? undefined
              : { path: "circuit-json", external: true },
          )
        },
      },
      {
        name: "shim-make-vfs",
        setup(build) {
          build.onResolve({ filter: /^make-vfs$/ }, () => ({
            path: makeVfsShimPath,
          }))
        },
      },
    ],
    external: [
      ...tscircuitPackageJsonDeps.filter(
        (dep) => dep !== "circuit-json" && !ALLOW_BUNDLING.includes(dep),
      ),
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

  if (copyPythonAssets) {
    // Palace's bundled orchestration resolves these scripts beside main.js.
    await cp(
      fileURLToPath(
        new URL(
          "./python/",
          import.meta.resolve("simulate-return-current/palace"),
        ),
      ),
      join(outdir, "cli", "python"),
      { recursive: true },
    )
  }

  if (!silent) {
    for (const output of outputs) {
      console.log(
        `${basename(output.path)} ${(output.size / 1024 / 1024).toFixed(2)} MB`,
      )
    }
  }

  return outputs
}

if (import.meta.main) {
  await buildCli()
}

export {}
