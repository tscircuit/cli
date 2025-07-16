import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import kleur from "kleur"
import os from "node:os"
import crypto from "node:crypto"

let _looksSame: any | null = null
let triedLooksSame = false
const loadLooksSame = async () => {
  if (!triedLooksSame) {
    triedLooksSame = true
    try {
      _looksSame = await import("looks-same")
    } catch {
      console.warn(
        "looks-same not found. Install it with 'bun add -d looks-same' to enable image comparisons.",
      )
      _looksSame = null
    }
  }
  return _looksSame
}
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToSimple3dSvg } from "circuit-json-to-simple-3d"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"

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
}: SnapshotOptions = {}) => {
  const projectDir = process.cwd()
  const ignore = [
    ...DEFAULT_IGNORED_PATTERNS,
    ...ignored.map(normalizeIgnorePattern),
  ]

  const boardFiles =
    filePaths.length > 0
      ? filePaths.map((f) => path.resolve(projectDir, f))
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
    const { circuitJson } = await generateCircuitJson({ filePath: file })
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

    const looksSame = await loadLooksSame()
    if (!looksSame) {
      console.error(
        "looks-same is required. Install it with 'bun add -d looks-same'",
      )
      return onExit(1)
    }

    for (const [type, newSvg] of pairs) {
      const snapPath = path.join(snapDir, `${base}-${type}.snap.svg`)
      const existing = fs.existsSync(snapPath)
      if (!existing) {
        fs.writeFileSync(snapPath, newSvg, "utf8")
        console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
        didUpdate = true
        continue
      }

      const oldSvg = fs.readFileSync(snapPath, "utf8")
      const bufNew = Buffer.from(newSvg, "utf8")
      const bufOld = Buffer.from(oldSvg, "utf8")

      const { equal } = await looksSame.default(bufNew, bufOld, {
        strict: false,
        tolerance: 2,
      })

      if (update) {
        if (!forceUpdate && equal) {
          console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
        } else {
          fs.writeFileSync(snapPath, newSvg, "utf8")
          console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
          didUpdate = true
        }
      } else if (!equal) {
        const diffPath = snapPath.replace(".snap.svg", ".diff.png")
        const diffBuffer: Buffer = await looksSame.createDiff({
          reference: bufOld,
          current: bufNew,
          highlightColor: "#ff00ff",
          tolerance: 2,
          extension: "png",
        }) // returns a Buffer because no diff path given :contentReference[oaicite:4]{index=4}

        fs.writeFileSync(diffPath, diffBuffer)
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
