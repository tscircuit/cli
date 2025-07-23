import { extname, basename } from "node:path"

const result = await Bun.build({
  entrypoints: ["./cli/main.ts"],
  target: "node",
  outdir: "./dist",
  external: [
    "@tscircuit/*",
    "looks-same",
    "tscircuit",
    "circuit-to-svg",
    "@types/*",
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
