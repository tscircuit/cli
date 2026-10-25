import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { emitNativeTwoStageDiagnostics } from "../fixtures/emit-native-two-stage-diagnostics"
test("keeps inputs, outputs and routed images for both stages of the same phase", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "native-stage-artifacts-"),
  )
  try {
    const { stages } = emitNativeTwoStageDiagnostics(directory)
    for (const [stageIndex, stage] of stages.entries()) {
      const prefix = path.join(directory, `phase-7-stage-${stageIndex}`)
      expect(fs.existsSync(`${prefix}.input.simple-route.json`)).toBe(true)
      expect(
        JSON.parse(
          fs.readFileSync(`${prefix}.input.simple-route.json`, "utf8"),
        ),
      ).toEqual(stage.input)
      expect(
        JSON.parse(fs.readFileSync(`${prefix}.output.traces.json`, "utf8")),
      ).toEqual(stage.output.traces)
      expect(fs.statSync(`${prefix}-routed.png`).size).toBeGreaterThan(0)
    }
    expect(
      fs
        .readFileSync(path.join(directory, "phase-7-stage-0-routed.png"))
        .equals(
          fs.readFileSync(path.join(directory, "phase-7-stage-1-routed.png")),
        ),
    ).toBe(false)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
