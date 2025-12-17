import { test, expect } from "bun:test"
import path from "node:path"
import type { BuildFileResult } from "../../../../cli/build/build-preview-images"

test("preview build selection: previewComponentPath takes precedence", () => {
  // Simulate the selection logic from buildPreviewImages
  const builtFiles: BuildFileResult[] = [
    {
      sourcePath: "/project/lib/index.tsx",
      outputPath: "/project/dist/lib/index/circuit.json",
      ok: true,
    },
    {
      sourcePath: "/project/examples/showcase.tsx",
      outputPath: "/project/dist/examples/showcase/circuit.json",
      ok: true,
    },
  ]

  const mainEntrypoint = "/project/lib/index.tsx"
  const previewComponentPath = "/project/examples/showcase.tsx"

  // This mimics the logic in buildPreviewImages
  const successfulBuilds = builtFiles.filter((file) => file.ok)
  const previewEntrypoint = previewComponentPath || mainEntrypoint
  const resolvedPreviewEntrypoint = previewEntrypoint
    ? path.resolve(previewEntrypoint)
    : undefined

  const previewBuild = (() => {
    if (resolvedPreviewEntrypoint) {
      const match = successfulBuilds.find(
        (built) => path.resolve(built.sourcePath) === resolvedPreviewEntrypoint,
      )
      if (match) return match
    }
    return successfulBuilds[0]
  })()

  // Should select showcase (previewComponentPath) not lib (mainEntrypoint)
  expect(previewBuild?.sourcePath).toBe("/project/examples/showcase.tsx")
})
