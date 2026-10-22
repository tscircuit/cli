import { execFile, spawn } from "node:child_process"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"

export const runPcbSpiceSimulation = async (
  file: string,
  options: { output?: string; open?: boolean },
  projectDir: string,
) => {
  const outputDir = resolve(options.output ?? `runs/simulation-${Date.now()}`)
  // Upstream uses Node's tsx loader, which cannot run inside Bun. Its CLI owns
  // ImportedBoard serialization, native runtime checks and report generation.
  const executable = fileURLToPath(
    new URL("./cli.mjs", import.meta.resolve("pcb-spice-pipeline")),
  )
  const require = createRequire(executable)
  const tsx = require.resolve("tsx/esm")
  // Match the CLI builder's classic JSX fallback for projects without tsconfig.
  const reactUrl = pathToFileURL(require.resolve("react")).href
  const reactPrelude = `data:text/javascript,${encodeURIComponent(`import React from ${JSON.stringify(reactUrl)};globalThis.React=React`)}`
  const child = spawn(
    "node",
    [
      "--import",
      tsx,
      "--import",
      reactPrelude,
      executable,
      resolve(file),
      "--out",
      outputDir,
    ],
    { stdio: "inherit", cwd: projectDir },
  )
  await new Promise<void>((done, reject) => {
    child.once("error", (error) =>
      reject(
        new Error(`pcb_spice requires Node.js 22+ on PATH: ${error.message}`),
      ),
    )
    child.once("exit", (code, signal) => {
      if (code === 0) done()
      else reject(new Error(`pcb_spice failed (${signal ?? `exit ${code}`})`))
    })
  })
  const reportPath = resolve(outputDir, "results.html")
  console.log(`Simulation report: ${reportPath}`)
  console.log(`Simulation receipt: ${resolve(outputDir, "receipt.json")}`)

  if (options.open) {
    const command =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "rundll32"
          : "xdg-open"
    const args =
      process.platform === "win32"
        ? ["url.dll,FileProtocolHandler", reportPath]
        : [reportPath]
    await promisify(execFile)(command, args)
  }
}
