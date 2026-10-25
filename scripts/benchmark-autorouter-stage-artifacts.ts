import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { emitNativeTwoStageDiagnostics } from "../tests/fixtures/emit-native-two-stage-diagnostics"
const report = []
for (const mode of ["single", "two", "two_images"] as const) {
  const times: number[] = []
  let result: any
  for (let trial = 0; trial < 6; trial++) {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "stage-artifact-benchmark-"),
    )
    const start = performance.now()
    const { fixture, stages } = emitNativeTwoStageDiagnostics(
      directory,
      mode === "two_images",
      mode === "single",
    )
    const elapsed = performance.now() - start
    const files = fs.readdirSync(directory)
    const inputs = files.filter((f) => f.endsWith(".input.simple-route.json"))
    const outputs = files.filter((f) => f.endsWith(".output.traces.json"))
    const images = files
      .filter((f) => f.startsWith("phase-7") && f.endsWith("-routed.png"))
      .sort()
    const inputHashes = inputs.map((f) =>
      createHash("sha256")
        .update(
          JSON.stringify(
            JSON.parse(fs.readFileSync(path.join(directory, f), "utf8")),
          ),
        )
        .digest("hex"),
    )
    const expectedHashes = stages.map((stage) =>
      createHash("sha256").update(JSON.stringify(stage.input)).digest("hex"),
    )
    const outputHashes = outputs.map((file) =>
      createHash("sha256")
        .update(
          JSON.stringify(
            JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")),
          ),
        )
        .digest("hex"),
    )
    const expectedOutputHashes = stages.map((stage) =>
      createHash("sha256")
        .update(JSON.stringify(stage.output.traces))
        .digest("hex"),
    )
    result = {
      mode,
      inputFixtureSha256: createHash("sha256")
        .update(JSON.stringify(fixture))
        .digest("hex"),
      retainedInputs: inputs.length,
      retainedOutputs: outputs.length,
      allStageOutputsRetained: expectedOutputHashes.every((hash) =>
        outputHashes.includes(hash),
      ),
      outputHashes: outputHashes.sort(),
      retainedImages: images.length,
      allStageInputsRetained: expectedHashes.every((hash) =>
        inputHashes.includes(hash),
      ),
      legacySingleStageNames:
        mode !== "single" ||
        (inputs.includes("phase-7.input.simple-route.json") &&
          outputs.includes("phase-7.output.traces.json")),
      finalImageSha256: images.length
        ? createHash("sha256")
            .update(fs.readFileSync(path.join(directory, images.at(-1)!)))
            .digest("hex")
        : null,
      files: files.sort(),
    }
    if (trial) times.push(elapsed)
    fs.rmSync(directory, { recursive: true, force: true })
  }
  times.sort((a, b) => a - b)
  report.push({ ...result, medianMs: times[2], trialsMs: times })
}
const json = `${JSON.stringify(
  {
    scope:
      "Generated native two-stage event/artifact retention benchmark; no routing algorithm changes",
    bun: Bun.version,
    cases: report,
  },
  null,
  2,
)}\n`
if (process.argv[2]) fs.writeFileSync(process.argv[2], json)
console.log(json)
