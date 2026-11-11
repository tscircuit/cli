import { cp } from "node:fs/promises"
import { basename, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { BunPlugin } from "bun"
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

const virtualFilesystemShimPath = fileURLToPath(
  new URL("../lib/shared/virtual-filesystem.ts", import.meta.url),
)

const replaceBundledMakeVfsPlugin: BunPlugin = {
  name: "replace-bundled-make-vfs",
  setup(build) {
    build.onResolve({ filter: /^make-vfs$/ }, () => ({
      path: virtualFilesystemShimPath,
    }))
  },
}

export async function buildCliBundles({
  outdir = "./dist",
  logOutputs = true,
}: {
  outdir?: string
  logOutputs?: boolean
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
    plugins: [replaceBundledMakeVfsPlugin],
    external: [
      ...tscircuitPackageJsonDeps.filter(
        (dep) => !ALLOW_BUNDLING.includes(dep),
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
    throw new Error("CLI bundle build failed")
  }

  // Palace's bundled orchestration resolves these scripts beside main.js.
  await cp(
    fileURLToPath(
      new URL(
        "./python/",
        import.meta.resolve("simulate-return-current/palace"),
      ),
    ),
    join(outdir, "cli/python"),
    { recursive: true },
  )

  if (logOutputs) {
    for (const output of outputs) {
      console.log(
        `${basename(output.path)} ${(output.size / 1024 / 1024).toFixed(2)} MB`,
      )
    }
  }

  return result
}

if (import.meta.main) {
  await buildCliBundles().catch(() => {
    process.exit(1)
  })
}
