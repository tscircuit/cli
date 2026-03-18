import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToGltf,
  getBestCameraPosition,
} from "circuit-json-to-gltf"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import kleur from "kleur"
import { type CameraPreset, applyCameraPreset } from "lib/shared/camera-presets"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCircuitJsonToGltfOptions } from "lib/shared/get-circuit-json-to-gltf-options"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { compareAndCreateDiff } from "./compare-images"
import { isCircuitJsonFile } from "./is-circuit-json-file"

export type ProcessSnapshotFileOptions = {
  file: string
  projectDir: string
  snapshotsDirName?: string
  update: boolean
  threeD: boolean
  pcbOnly: boolean
  schematicOnly: boolean
  forceUpdate: boolean
  platformConfig?: PlatformConfig
  pcbSnapshotSettings?: PcbSnapshotSettings
  createDiff: boolean
  cameraPreset?: CameraPreset
}

export type ProcessSnapshotFileResult = {
  ok: boolean
  didUpdate: boolean
  successPaths: string[]
  warningMessages: string[]
  mismatches: string[]
  errorMessage?: string
}

export const processSnapshotFile = async ({
  file,
  projectDir,
  snapshotsDirName,
  update,
  threeD,
  pcbOnly,
  schematicOnly,
  forceUpdate,
  platformConfig,
  pcbSnapshotSettings,
  createDiff,
  cameraPreset,
}: ProcessSnapshotFileOptions): Promise<ProcessSnapshotFileResult> => {
  const relativeFilePath = path.relative(projectDir, file)
  const successPaths: string[] = []
  const warningMessages: string[] = []
  const mismatches: string[] = []
  let didUpdate = false

  let circuitJson: AnyCircuitElement[]
  let pcbSvg: string
  let schSvg: string

  try {
    if (isCircuitJsonFile(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"))
      circuitJson = Array.isArray(parsed) ? parsed : []
    } else {
      const completePlatformConfig = getCompletePlatformConfig(platformConfig)

      const result = await generateCircuitJson({
        filePath: file,
        platformConfig: completePlatformConfig,
      })
      circuitJson = result.circuitJson
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      didUpdate: false,
      successPaths,
      warningMessages,
      mismatches,
      errorMessage:
        kleur.red(
          `\n❌ Failed to generate circuit JSON for ${relativeFilePath}:\n`,
        ) + kleur.red(`   ${errorMessage}\n`),
    }
  }

  try {
    pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, pcbSnapshotSettings)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      didUpdate: false,
      successPaths,
      warningMessages,
      mismatches,
      errorMessage:
        kleur.red(
          `\n❌ Failed to generate PCB SVG for ${relativeFilePath}:\n`,
        ) + kleur.red(`   ${errorMessage}\n`),
    }
  }

  try {
    schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      didUpdate: false,
      successPaths,
      warningMessages,
      mismatches,
      errorMessage:
        kleur.red(
          `\n❌ Failed to generate schematic SVG for ${relativeFilePath}:\n`,
        ) + kleur.red(`   ${errorMessage}\n`),
    }
  }

  let png3d: Buffer | null = null
  if (threeD) {
    try {
      const glbBuffer = await convertCircuitJsonToGltf(
        circuitJson,
        getCircuitJsonToGltfOptions({ format: "glb" }),
      )
      if (!(glbBuffer instanceof ArrayBuffer)) {
        throw new Error(
          "Expected ArrayBuffer from convertCircuitJsonToGltf with glb format",
        )
      }

      let cameraOptions = getBestCameraPosition(circuitJson)
      if (cameraPreset) {
        cameraOptions = applyCameraPreset(cameraPreset, cameraOptions)
      }

      png3d = await renderGLTFToPNGBufferFromGLBBuffer(glbBuffer, cameraOptions)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (errorMessage.includes("No pcb_board found in circuit JSON")) {
        const fileDir = path.dirname(file)
        const relativeDir = path.relative(projectDir, fileDir)
        const snapDir = snapshotsDirName
          ? path.join(projectDir, snapshotsDirName, relativeDir)
          : path.join(fileDir, "__snapshots__")
        const base = path.basename(file).replace(/\.[^.]+$/, "")
        const snap3dPath = path.join(snapDir, `${base}-3d.snap.png`)
        const existing3dSnapshot = fs.existsSync(snap3dPath)

        if (existing3dSnapshot) {
          return {
            ok: false,
            didUpdate: false,
            successPaths,
            warningMessages,
            mismatches,
            errorMessage:
              kleur.red(
                `\n❌ Failed to generate 3D snapshot for ${relativeFilePath}:\n`,
              ) +
              kleur.red(`   No pcb_board found in circuit JSON\n`) +
              kleur.red(
                `   Existing snapshot: ${path.relative(projectDir, snap3dPath)}\n`,
              ),
          }
        }

        warningMessages.push(
          kleur.red(`⚠️  Skipping 3D snapshot for ${relativeFilePath}:`) +
            kleur.red(` No pcb_board found in circuit JSON`),
        )
        png3d = null
      } else {
        return {
          ok: false,
          didUpdate: false,
          successPaths,
          warningMessages,
          mismatches,
          errorMessage:
            kleur.red(
              `\n❌ Failed to generate 3D snapshot for ${relativeFilePath}:\n`,
            ) + kleur.red(`   ${errorMessage}\n`),
        }
      }
    }
  }

  const snapDir = snapshotsDirName
    ? path.join(
        projectDir,
        snapshotsDirName,
        path.relative(projectDir, path.dirname(file)),
      )
    : path.join(path.dirname(file), "__snapshots__")

  fs.mkdirSync(snapDir, { recursive: true })

  const base = path.basename(file).replace(/\.[^.]+$/, "")
  const snapshots: Array<
    | { type: "pcb" | "schematic"; content: string; isBinary: false }
    | { type: "3d"; content: Buffer; isBinary: true }
  > = []
  if (pcbOnly || !schematicOnly) {
    snapshots.push({ type: "pcb", content: pcbSvg, isBinary: false })
  }
  if (schematicOnly || !pcbOnly) {
    snapshots.push({ type: "schematic", content: schSvg, isBinary: false })
  }
  if (threeD && png3d) {
    snapshots.push({ type: "3d", content: png3d, isBinary: true })
  }

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
      successPaths.push(path.relative(projectDir, snapPath))
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
      createDiff,
    )

    if (update) {
      if (!forceUpdate && equal) {
        successPaths.push(path.relative(projectDir, snapPath))
      } else {
        fs.writeFileSync(snapPath, newContentForFile)
        successPaths.push(path.relative(projectDir, snapPath))
        didUpdate = true
      }
    } else if (!equal) {
      mismatches.push(createDiff ? `${snapPath} (diff: ${diffPath})` : snapPath)
    } else {
      successPaths.push(path.relative(projectDir, snapPath))
    }
  }

  return {
    ok: true,
    didUpdate,
    successPaths,
    warningMessages,
    mismatches,
  }
}
