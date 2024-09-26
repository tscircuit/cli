import path from "path"
import fs from "fs/promises"
import { spawn } from "bun"
import { AppContext } from "../util/app-context"

export const genJlcpcbComponent = async (
  ctx: AppContext,
  args: { partNumber: string },
) => {
  const normalizedPartNumber = args.partNumber.toUpperCase()

  const baseCommand = "easyeda"
  const generatorExecutable = path.resolve(
    ctx.cwd,
    "node_modules/.bin",
    process.platform === "win32" ? `${baseCommand}.cmd` : baseCommand,
  )

  const outputDir = path.resolve(ctx.cwd, "gen")
  const outputFile = path.join(outputDir, `${normalizedPartNumber}.tsx`)

  await fs.mkdir(outputDir, { recursive: true })

  const cmd = [
    generatorExecutable,
    "convert",
    "-i",
    normalizedPartNumber,
    "-o",
    outputFile,
    "-t",
    "tsx",
  ]

  const proc = spawn({
    cmd,
    stdout: "inherit",
    stderr: "pipe",
  })

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(
      `JLCPCB component generation failed with exit code ${exitCode}: ${stderr}`,
    )
  }

  console.log(`Generated JLCPCB component at: ${outputFile}`)
}
