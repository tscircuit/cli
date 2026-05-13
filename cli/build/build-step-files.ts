import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import type { BuildFileResult } from "./build-preview-images"
import { writeStepFromCircuitJson } from "./worker-output-generators"

export const buildStepFiles = async ({
  builtFiles,
  distDir,
}: {
  builtFiles: BuildFileResult[]
  distDir: string
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)

  if (successfulBuilds.length === 0) {
    console.warn("No successful build output available for STEP generation.")
    return
  }

  for (const build of successfulBuilds) {
    const outputDir = path.dirname(build.outputPath)
    const prefixRelative = path.relative(distDir, outputDir) || "."
    const prefix = prefixRelative === "." ? "" : `[${prefixRelative}] `

    let circuitJson: AnyCircuitElement[]
    try {
      const circuitJsonRaw = fs.readFileSync(build.outputPath, "utf-8")
      circuitJson = JSON.parse(circuitJsonRaw)
    } catch (error) {
      console.error(`${prefix}Failed to read circuit JSON:`, error)
      continue
    }

    try {
      console.log(`${prefix}Converting circuit to STEP...`)
      await writeStepFromCircuitJson(
        circuitJson,
        path.join(outputDir, "3d.step"),
      )
      console.log(`${prefix}Written 3d.step`)
    } catch (error) {
      console.error(`${prefix}Failed to generate STEP:`, error)
    }
  }
}
