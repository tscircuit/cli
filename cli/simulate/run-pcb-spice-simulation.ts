import { spawn } from "node:child_process"
import { once } from "node:events"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const runPcbSpiceSimulation = async ({
  file,
  output,
  projectDir,
}: {
  file: string
  output?: string
  projectDir: string
}) => {
  const outputDir = resolve(output ?? `runs/simulation-${Date.now()}`)
  // Upstream's loadEntry uses tsx/esm/api, whose loader requires Node.
  const executable = fileURLToPath(
    new URL("./cli.mjs", import.meta.resolve("pcb-spice-pipeline")),
  )
  const require = createRequire(executable)
  const tsx = require.resolve("tsx/esm")
  const child = spawn(
    process.versions.bun ? "node" : process.execPath,
    ["--import", tsx, executable, resolve(file), "--out", outputDir],
    { stdio: "inherit", cwd: projectDir },
  )
  const [code, signal] = await once(child, "exit")
  if (code !== 0) {
    throw new Error(`pcb_spice failed (${signal ?? `exit ${code}`})`)
  }
}
