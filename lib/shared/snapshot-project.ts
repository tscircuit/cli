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
import kleur from "kleur"
import { getSnapshotsDir } from "lib/project-config"
import { RpcWorkerPool } from "lib/rpc-worker/worker-pool"
import { findBoardFiles } from "lib/shared/find-board-files"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCircuitJsonToGltfOptions } from "lib/shared/get-circuit-json-to-gltf-options"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"
import looksSame from "looks-same"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { compareAndCreateDiff } from "./compare-images"

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
  /** Number of files to process in parallel */
  concurrency?: number
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
  concurrency = 1,
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

  const processFile = async (
    file: string,
  ): Promise<{
    didUpdate: boolean
    mismatches: string[]
    errors: string[]
  }> => {
    const relativeFilePath = path.relative(projectDir, file)
    const fileDidUpdate = false
    const fileMismatches: string[] = []
    const fileErrors: string[] = []

    let circuitJson: any
    let pcbSvg: string
    let schSvg: string

    try {
      const completePlatformConfig = getCompletePlatformConfig(platformConfig)

      const result = await generateCircuitJson({
        filePath: file,
        platformConfig: completePlatformConfig,
      })
      circuitJson = result.circuitJson
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      fileErrors.push(
        `Failed to generate circuit JSON for ${relativeFilePath}: ${errorMessage}`,
      )
      return {
        didUpdate: fileDidUpdate,
        mismatches: fileMismatches,
        errors: fileErrors,
      }
    }

    try {
      pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      fileErrors.push(
        `Failed to generate PCB SVG for ${relativeFilePath}: ${errorMessage}`,
      )
      return {
        didUpdate: fileDidUpdate,
        mismatches: fileMismatches,
        errors: fileErrors,
      }
    }

    try {
      schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      fileErrors.push(
        `Failed to generate schematic SVG for ${relativeFilePath}: ${errorMessage}`,
      )
      return {
        didUpdate: fileDidUpdate,
        mismatches: fileMismatches,
        errors: fileErrors,
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

        const cameraOptions = getBestCameraPosition(circuitJson)

        png3d = await renderGLTFToPNGBufferFromGLBBuffer(
          glbBuffer,
          cameraOptions,
        )
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

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
            fileErrors.push(
              `Failed to generate 3D snapshot for ${relativeFilePath}: No pcb_board found in circuit JSON. Existing snapshot: ${path.relative(projectDir, snap3dPath)}`,
            )
          } else {
            console.log(
              kleur.red(`⚠️  Skipping 3D snapshot for ${relativeFilePath}:`) +
                kleur.red(` No pcb_board found in circuit JSON`),
            )
            png3d = null
          }
        } else {
          fileErrors.push(
            `Failed to generate 3D snapshot for ${relativeFilePath}: ${errorMessage}`,
          )
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
      return {
        didUpdate: fileDidUpdate,
        mismatches: fileMismatches,
        errors: ["looks-same is required"],
      }
    }

    let didUpdateForFile = false

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
        didUpdateForFile = true
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
          didUpdateForFile = true
        }
      } else if (!equal) {
        fileMismatches.push(`${snapPath} (diff: ${diffPath})`)
      } else {
        console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
      }
    }

    return {
      didUpdate: didUpdateForFile,
      mismatches: fileMismatches,
      errors: fileErrors,
    }
  }

  let didUpdate = false
  const mismatches: string[] = []
  const allErrors: string[] = []

  if (concurrency <= 1) {
    for (const file of boardFiles) {
      const result = await processFile(file)
      didUpdate = didUpdate || result.didUpdate
      mismatches.push(...result.mismatches)
      allErrors.push(...result.errors)

      if (result.errors.length > 0) {
        for (const err of result.errors) {
          onError(kleur.red(`\n❌ ${err}\n`))
        }
      }
    }
  } else {
    console.log(
      `Processing ${boardFiles.length} file(s) with concurrency ${concurrency}...`,
    )

    const pool = new RpcWorkerPool({
      concurrency,
      service: "snapshot",
      onLog: (lines: string[]) => {
        for (const line of lines) {
          console.log(line)
        }
      },
    })

    const jobs = boardFiles.map((filePath) => ({
      method: "snapshotFile",
      args: {
        filePath,
        projectDir,
        options: {
          update,
          threeD,
          pcbOnly,
          schematicOnly,
          forceUpdate,
          snapshotsDirName,
          platformConfig,
        },
      },
    }))

    await pool.runJobs(jobs, (result: any) => {
      const relativeFilePath = path.relative(projectDir, result.filePath)

      didUpdate = didUpdate || result.didUpdate
      mismatches.push(...result.mismatches)
      allErrors.push(...result.errors)

      if (result.errors.length > 0) {
        for (const err of result.errors) {
          onError(kleur.red(`\n❌ ${err}\n`))
        }
      } else {
        console.log(kleur.green(`✓ ${relativeFilePath}`))
      }
    })

    await pool.terminate()
  }

  if (update) {
    if (allErrors.length > 0) {
      onError(
        `\n❌ ${allErrors.length} error(s) occurred during snapshot update\n`,
      )
      return onExit(1)
    }
    didUpdate
      ? onSuccess("Created snapshots")
      : onSuccess("All snapshots already up to date")
    return onExit(0)
  }

  if (allErrors.length > 0) {
    onError(
      `\n❌ ${allErrors.length} error(s) occurred during snapshot generation\n`,
    )
    return onExit(1)
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
