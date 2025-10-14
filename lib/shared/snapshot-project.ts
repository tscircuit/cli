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
import { findBoardFiles } from "lib/shared/find-board-files"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"
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

  const mismatches: string[] = []
  let didUpdate = false

  for (const file of boardFiles) {
    const { circuitJson } = await generateCircuitJson({
      filePath: file,
      platformConfig,
    })
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    const schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    let png3d: Buffer | null = null
    if (threeD) {
      const glbBuffer = await convertCircuitJsonToGltf(circuitJson, {
        format: "glb",
      })
      if (!(glbBuffer instanceof ArrayBuffer)) {
        throw new Error(
          "Expected ArrayBuffer from convertCircuitJsonToGltf with glb format",
        )
      }
      png3d = await renderGLTFToPNGBufferFromGLBBuffer(glbBuffer, {
        camPos: [10, 10, 10],
        lookAt: [0, 0, 0],
      })
    }

    const snapDir = path.join(path.dirname(file), "__snapshots__")
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
