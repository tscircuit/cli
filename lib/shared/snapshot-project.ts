import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import kleur from "kleur"
import looksSame from "looks-same"
import sharp from "sharp"

import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToSimple3dSvg } from "circuit-json-to-simple-3d"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import type { PlatformConfig } from "@tscircuit/props"
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

  const boardFiles =
    resolvedPaths.length > 0
      ? resolvedPaths.flatMap((p) => {
          if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            return globbySync(["**/*.board.tsx", "**/*.circuit.tsx"], {
              cwd: p,
              ignore,
            }).map((f) => path.join(p, f))
          }
          return [p]
        })
      : globbySync(["**/*.board.tsx", "**/*.circuit.tsx"], {
          cwd: projectDir,
          ignore,
        }).map((f) => path.join(projectDir, f))

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
    const svg3d = threeD
      ? await convertCircuitJsonToSimple3dSvg(circuitJson)
      : null

    const snapDir = path.join(path.dirname(file), "__snapshots__")
    fs.mkdirSync(snapDir, { recursive: true })

    const base = path.basename(file).replace(/\.tsx$/, "")
    const pairs: Array<["pcb" | "schematic" | "3d", string]> = []
    if (pcbOnly || !schematicOnly) pairs.push(["pcb", pcbSvg])
    if (schematicOnly || !pcbOnly) pairs.push(["schematic", schSvg])
    if (threeD && svg3d) pairs.push(["3d", svg3d])

    if (!looksSame) {
      console.error(
        "looks-same is required. Install it with 'bun add -d looks-same'",
      )
      return onExit(1)
    }

    for (const [type, newSvg] of pairs) {
      const is3d = type === "3d"
      const snapPath = path.join(
        snapDir,
        `${base}-${type}.snap.${is3d ? "png" : "svg"}`,
      )
      const existing = fs.existsSync(snapPath)

      const newContentBuffer = is3d
        ? await sharp(Buffer.from(newSvg)).png().toBuffer()
        : Buffer.from(newSvg, "utf8")

      const newContentForFile = is3d ? newContentBuffer : newSvg

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
