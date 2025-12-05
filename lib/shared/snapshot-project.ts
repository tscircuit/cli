import fs from "node:fs"
import path from "node:path"
import kleur from "kleur"
import looksSame from "looks-same"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { findBoardFiles } from "lib/shared/find-board-files"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"
import { compareAndCreateDiff } from "./compare-images"
import { getSnapshotsDir } from "lib/project-config"
import { calculateCameraPosition } from "lib/shared/calculate-camera-position"

type SnapshotOptions = {
  update?: boolean
  ignored?: string[]
  /** Enable generation of 3d preview snapshots */
  threeD?: boolean
  /** Only generate PCB snapshots */
  pcbOnly?: boolean
  /** Only generate schematic snapshots */
  schematicOnly?: boolean
  /** Snapshot only the specified files */
  filePaths?: string[]
  /** Force updating snapshots even if they match */
  forceUpdate?: boolean
  /** Optional platform configuration overrides */
  platformConfig?: PlatformConfig
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

export const snapshotProject = async ({
  update = false,
  ignored = [],
  threeD = false,
  pcbOnly = false,
  schematicOnly = false,
  filePaths = [],
  forceUpdate = false,
  onExit = (code) => process.exit(code),
  onError = (msg) => console.error(msg),
  onSuccess = (msg) => console.log(msg),
  platformConfig,
}: SnapshotOptions = {}) => {
  const projectDir = process.cwd()
  const ignore = [
    ...DEFAULT_IGNORED_PATTERNS,
    ...ignored.map(normalizeIgnorePattern),
  ]

  const resolvedPaths = filePaths.map((f) => path.resolve(projectDir, f))
  const boardFiles = findBoardFiles({
    projectDir,
    ignore,
    filePaths: resolvedPaths,
  })

  if (boardFiles.length === 0) {
    console.log(
      "No entrypoint found. Run 'tsci init' to bootstrap a project or specify a file with 'tsci snapshot <file>'",
    )
    return onExit(0)
  }

  const snapshotsDirName = getSnapshotsDir(projectDir)
  const mismatches: string[] = []
  let didUpdate = false

  for (const file of boardFiles) {
    const relativeFilePath = path.relative(projectDir, file)

    let circuitJson: any
    let pcbSvg: string
    let schSvg: string

    try {
      // Get complete platform config with kicad_mod support
      const completePlatformConfig = getCompletePlatformConfig(platformConfig)

      const result = await generateCircuitJson({
        filePath: file,
        platformConfig: completePlatformConfig,
      })
      circuitJson = result.circuitJson
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      onError(
        kleur.red(
          `\n❌ Failed to generate circuit JSON for ${relativeFilePath}:\n`,
        ) + kleur.red(`   ${errorMessage}\n`),
      )
      return onExit(1)
    }

    try {
      pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      onError(
        kleur.red(
          `\n❌ Failed to generate PCB SVG for ${relativeFilePath}:\n`,
        ) + kleur.red(`   ${errorMessage}\n`),
      )
      return onExit(1)
    }

    try {
      schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      onError(
        kleur.red(
          `\n❌ Failed to generate schematic SVG for ${relativeFilePath}:\n`,
        ) + kleur.red(`   ${errorMessage}\n`),
      )
      return onExit(1)
    }
    let png3d: Buffer | null = null
    if (threeD) {
      try {
        const glbBuffer = await convertCircuitJsonToGltf(circuitJson, {
          format: "glb",
        })
        if (!(glbBuffer instanceof ArrayBuffer)) {
          throw new Error(
            "Expected ArrayBuffer from convertCircuitJsonToGltf with glb format",
          )
        }
        const cameraSettings = calculateCameraPosition(
          circuitJson as AnyCircuitElement[],
        )
        png3d = await renderGLTFToPNGBufferFromGLBBuffer(glbBuffer, {
          camPos: cameraSettings.camPos,
          lookAt: cameraSettings.lookAt,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        // Check if it's a "no pcb_board" error
        if (errorMessage.includes("No pcb_board found in circuit JSON")) {
          const fileDir = path.dirname(file)
          const relativeDir = path.relative(projectDir, fileDir)
          const snapDir = snapshotsDirName
            ? path.join(projectDir, snapshotsDirName, relativeDir)
            : path.join(fileDir, "__snapshots__")
          const base = path.basename(file).replace(/\.tsx$/, "")
          const snap3dPath = path.join(snapDir, `${base}-3d.snap.png`)
          const existing3dSnapshot = fs.existsSync(snap3dPath)

          if (existing3dSnapshot) {
            // Error if there's an existing snapshot
            onError(
              kleur.red(
                `\n❌ Failed to generate 3D snapshot for ${relativeFilePath}:\n`,
              ) +
                kleur.red(`   No pcb_board found in circuit JSON\n`) +
                kleur.red(
                  `   Existing snapshot: ${path.relative(projectDir, snap3dPath)}\n`,
                ),
            )
            return onExit(1)
          } else {
            // Skip with warning if no existing snapshot
            console.log(
              kleur.red(`⚠️  Skipping 3D snapshot for ${relativeFilePath}:`) +
                kleur.red(` No pcb_board found in circuit JSON`),
            )
            png3d = null
          }
        } else {
          // For any other error, show board name and full error
          onError(
            kleur.red(
              `\n❌ Failed to generate 3D snapshot for ${relativeFilePath}:\n`,
            ) + kleur.red(`   ${errorMessage}\n`),
          )
          return onExit(1)
        }
      }
    }

    // Determine snapshot directory based on whether snapshotsDir is configured
    const snapDir = snapshotsDirName
      ? // If snapshotsDir is provided, everything goes in the snapshots directory
        path.join(
          projectDir,
          snapshotsDirName,
          path.relative(projectDir, path.dirname(file)),
        )
      : // If snapshotsDir isn't provided, we create a `__snapshots__` directory next to the file like jest
        path.join(path.dirname(file), "__snapshots__")

    fs.mkdirSync(snapDir, { recursive: true })

    const base = path.basename(file).replace(/\.tsx$/, "")
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

    if (!looksSame) {
      console.error(
        "looks-same is required. Install it with 'bun add -d looks-same'",
      )
      return onExit(1)
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
        console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
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
          console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
        } else {
          fs.writeFileSync(snapPath, newContentForFile)
          console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
          didUpdate = true
        }
      } else if (!equal) {
        mismatches.push(`${snapPath} (diff: ${diffPath})`)
      } else {
        console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
      }
    }
  }

  if (update) {
    didUpdate
      ? onSuccess("Created snapshots")
      : onSuccess("All snapshots already up to date")
    return onExit(0)
  }

  if (mismatches.length) {
    onError(
      `Snapshot mismatch:\n${mismatches.join("\n")}\n\nRun with --update to fix.`,
    )
    return onExit(1)
  }

  onSuccess("All snapshots match")
  return onExit(0)
}
