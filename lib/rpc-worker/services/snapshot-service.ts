import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import {
  convertCircuitJsonToGltf,
  getBestCameraPosition,
} from "circuit-json-to-gltf"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { generateCircuitJson } from "../../../lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "../../../lib/shared/get-complete-platform-config"
import type { SnapshotServiceMethods } from "../types"

const compareAndCreateDiff = async (
  oldContent: Buffer,
  newContent: Buffer,
  diffPath: string,
): Promise<{ equal: boolean }> => {
  const looksSame = (await import("looks-same")).default
  const { equal } = await looksSame(oldContent, newContent, {
    strict: false,
    tolerance: 2,
  })

  if (!equal) {
    if (diffPath.endsWith(".png")) {
      const looksSameModule = await import("looks-same")
      await looksSameModule.createDiff({
        reference: oldContent,
        current: newContent,
        diff: diffPath,
        highlightColor: "#ff00ff",
        tolerance: 2,
      })
    } else {
      fs.writeFileSync(diffPath, newContent)
    }
  }

  return { equal }
}

export const snapshotService: SnapshotServiceMethods = {
  async snapshotFile(args) {
    const { filePath, projectDir, options } = args
    const errors: string[] = []
    const warnings: string[] = []
    const mismatches: string[] = []
    let didUpdate = false

    try {
      process.chdir(projectDir)

      const relativeFilePath = path.relative(projectDir, filePath)

      const completePlatformConfig = getCompletePlatformConfig(
        options?.platformConfig,
      )

      const result = await generateCircuitJson({
        filePath,
        platformConfig: completePlatformConfig,
      })
      const circuitJson = result.circuitJson

      let pcbSvg: string
      let schSvg: string

      try {
        pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push(`Failed to generate PCB SVG: ${errorMessage}`)
        return {
          filePath,
          ok: false,
          didUpdate: false,
          mismatches: [],
          errors,
          warnings,
        }
      }

      try {
        schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push(`Failed to generate schematic SVG: ${errorMessage}`)
        return {
          filePath,
          ok: false,
          didUpdate: false,
          mismatches: [],
          errors,
          warnings,
        }
      }

      let png3d: Buffer | null = null
      if (options?.threeD) {
        try {
          const glbBuffer = await convertCircuitJsonToGltf(circuitJson, {
            format: "glb",
          })
          if (!(glbBuffer instanceof ArrayBuffer)) {
            throw new Error(
              "Expected ArrayBuffer from convertCircuitJsonToGltf with glb format",
            )
          }

          const cameraOptions = getBestCameraPosition(circuitJson)

          const { renderGLTFToPNGBufferFromGLBBuffer } = await import("poppygl")
          png3d = await renderGLTFToPNGBufferFromGLBBuffer(
            glbBuffer,
            cameraOptions,
          )
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)

          if (errorMessage.includes("No pcb_board found in circuit JSON")) {
            // Skip silently
          } else {
            warnings.push(`Failed to generate 3D snapshot: ${errorMessage}`)
          }
        }
      }

      const snapDir = options?.snapshotsDirName
        ? path.join(
            projectDir,
            options.snapshotsDirName,
            path.relative(projectDir, path.dirname(filePath)),
          )
        : path.join(path.dirname(filePath), "__snapshots__")

      fs.mkdirSync(snapDir, { recursive: true })

      const base = path.basename(filePath).replace(/\.tsx$/, "")
      const snapshots: Array<
        | { type: "pcb" | "schematic"; content: string; isBinary: false }
        | { type: "3d"; content: Buffer; isBinary: true }
      > = []

      const pcbOnly = options?.pcbOnly ?? false
      const schematicOnly = options?.schematicOnly ?? false

      if (pcbOnly || !schematicOnly) {
        snapshots.push({ type: "pcb", content: pcbSvg, isBinary: false })
      }
      if (schematicOnly || !pcbOnly) {
        snapshots.push({ type: "schematic", content: schSvg, isBinary: false })
      }
      if (options?.threeD && png3d) {
        snapshots.push({ type: "3d", content: png3d, isBinary: true })
      }

      const update = options?.update ?? false
      const forceUpdate = options?.forceUpdate ?? false

      for (const snapshot of snapshots) {
        const { type } = snapshot
        const is3d = type === "3d"
        const snapPath = path.join(
          snapDir,
          `${base}-${type}.snap.${is3d ? "png" : "svg"}`,
        )
        const existing = fs.existsSync(snapPath)

        const newContentBuffer = snapshot.isBinary
          ? snapshot.content
          : Buffer.from(snapshot.content, "utf8")

        const newContentForFile = snapshot.content

        if (!existing) {
          fs.writeFileSync(snapPath, newContentForFile)
          didUpdate = true
          continue
        }

        const oldContentBuffer = fs.readFileSync(snapPath)

        const diffPath = snapPath.replace(
          is3d ? ".snap.png" : ".snap.svg",
          is3d ? ".diff.png" : ".diff.svg",
        )

        const { equal } = await compareAndCreateDiff(
          oldContentBuffer,
          newContentBuffer,
          diffPath,
        )

        if (update) {
          if (!forceUpdate && equal) {
            // Up to date
          } else {
            fs.writeFileSync(snapPath, newContentForFile)
            didUpdate = true
          }
        } else if (!equal) {
          mismatches.push(`${snapPath} (diff: ${diffPath})`)
        }
      }

      return {
        filePath,
        ok: errors.length === 0,
        didUpdate,
        mismatches,
        errors,
        warnings,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      errors.push(errorMessage)

      return {
        filePath,
        ok: false,
        didUpdate: false,
        mismatches,
        errors,
        warnings,
      }
    }
  },
}
