import { test, expect } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { convertModelUrlsToFileUrls } from "cli/build/convert-model-urls-to-file-urls"
import { loadLocalStepModelFsMap } from "lib/shared/load-local-step-model-fs-map"
import { writeFile, mkdir, rm } from "node:fs/promises"
import os from "node:os"

test("convertModelUrlsToFileUrls resolves relative model URLs against specified baseDir", () => {
  const baseDir = path.resolve("/fake/project/dir")
  const circuitJson = [
    {
      type: "cad_component",
      cad_component_id: "cad_1",
      model_step_url: "./libraries/cap.step",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_2",
      model_glb_url: "models/chip.glb",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_3",
      model_step_url: "https://example.com/remote.step",
    },
  ]

  const converted = convertModelUrlsToFileUrls(circuitJson, baseDir)

  expect(converted[0].model_step_url).toBe(
    pathToFileURL(path.resolve(baseDir, "./libraries/cap.step")).href,
  )
  expect(converted[1].model_glb_url).toBe(
    pathToFileURL(path.resolve(baseDir, "models/chip.glb")).href,
  )
  expect(converted[2].model_step_url).toBe("https://example.com/remote.step")
})

test("loadLocalStepModelFsMap resolves relative step model against specified baseDir", async () => {
  const tmpDir = path.join(os.tmpdir(), `test-step-${Date.now()}`)
  await mkdir(path.join(tmpDir, "libraries"), { recursive: true })
  const stepFile = path.join(tmpDir, "libraries", "cap.step")
  await writeFile(stepFile, "ISO-10303-21; HEADER; ENDSEC; DATA; ENDSEC; END-ISO-10303-21;")

  try {
    const circuitJson = [
      {
        type: "cad_component",
        cad_component_id: "cad_1",
        model_step_url: "./libraries/cap.step",
      },
    ] as any

    const fsMap = await loadLocalStepModelFsMap(circuitJson, tmpDir)
    expect(fsMap["./libraries/cap.step"]).toBe(
      "ISO-10303-21; HEADER; ENDSEC; DATA; ENDSEC; END-ISO-10303-21;",
    )
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
