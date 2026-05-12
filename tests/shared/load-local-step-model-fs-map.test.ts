import { expect, test } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { loadLocalStepModelFsMap } from "lib/shared/load-local-step-model-fs-map"

test("loadLocalStepModelFsMap preloads local STEP model files", async () => {
  const tmpDir = temporaryDirectory()
  const previousCwd = process.cwd()
  globalThis.deferredCleanupFns.push(() =>
    rm(tmpDir, { recursive: true, force: true }),
  )

  const assetsDir = path.join(tmpDir, "node_modules", "pkg", "assets")
  await mkdir(assetsDir, { recursive: true })

  const relativeStepPath = "./node_modules/pkg/assets/model.step"
  const relativeStepContent =
    "ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n"
  await writeFile(path.join(tmpDir, relativeStepPath), relativeStepContent)

  try {
    process.chdir(tmpDir)

    const fsMap = await loadLocalStepModelFsMap([
      {
        type: "cad_component",
        model_step_url: relativeStepPath,
      },
      {
        type: "cad_component",
        model_step_url: "https://example.com/model.step",
      },
      {
        type: "cad_component",
        step_model_url: relativeStepPath,
      },
    ] as any)

    expect(fsMap[relativeStepPath]).toBe(relativeStepContent)
    expect(fsMap["https://example.com/model.step"]).toBeUndefined()
    expect(Object.keys(fsMap)).toEqual([relativeStepPath])
  } finally {
    process.chdir(previousCwd)
  }
})
