import { test, expect } from "bun:test"
import path from "node:path"
import type { BuildFileResult } from "../../../../cli/build/build-preview-images"

test("preview build selection: falls back to mainEntrypoint when no previewComponentPath", () => {
  const builtFiles: BuildFileResult[] = [
    {
      sourcePath: "/project/lib/index.tsx",
      outputPath: "/project/dist/lib/index/circuit.json",
      ok: true,
    },
    {
      sourcePath: "/project/other.tsx",
      outputPath: "/project/dist/other/circuit.json",
      ok: true,
    },
  ]

  const mainEntrypoint = "/project/lib/index.tsx"
  const previewComponentPath = undefined // Not set

  const successfulBuilds = builtFiles.filter((file) => file.ok)
  const previewEntrypoint = previewComponentPath || mainEntrypoint
  const normalizedPreviewEntrypoint = previewEntrypoint
    ? path.resolve(previewEntrypoint)
    : undefined

  const previewBuild = (() => {
    if (normalizedPreviewEntrypoint) {
      const match = successfulBuilds.find(
        (built) =>
          path.resolve(built.sourcePath) === normalizedPreviewEntrypoint,
      )
      if (match) return match
    }
    return successfulBuilds[0]
  })()

  // Should select mainEntrypoint
  expect(previewBuild?.sourcePath).toBe("/project/lib/index.tsx")
})
