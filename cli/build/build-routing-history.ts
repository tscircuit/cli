import fs from "node:fs"
import path from "node:path"
import { getCircuitJsonBuildHistory } from "lib/shared/circuit-json-build-history"
import { renderRoutingHistoryVideo } from "lib/shared/render-routing-history-video"
import type { BuildFileResult } from "./build-preview-images"

/** Writes routing-history.mp4 next to each successful build's circuit.json. */
export const buildRoutingHistory = async ({
  builtFiles,
  projectDir,
}: {
  builtFiles: BuildFileResult[]
  projectDir: string
}) => {
  const successfulBuilds = builtFiles.filter((file) => file.ok)

  if (successfulBuilds.length === 0) {
    console.warn("No successful build output available for routing history.")
    return
  }

  for (const build of successfulBuilds) {
    const history = getCircuitJsonBuildHistory({
      projectDir,
      outputPath: build.outputPath,
    })
    const videoPath = path.join(
      path.dirname(build.outputPath),
      "routing-history.mp4",
    )
    fs.writeFileSync(videoPath, await renderRoutingHistoryVideo(history))
    console.log(
      `Written ${path.relative(projectDir, videoPath)} (${history.length} build${history.length === 1 ? "" : "s"})`,
    )
  }
}
