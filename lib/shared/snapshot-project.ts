import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import kleur from "kleur"
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

let looksSamePromise: Promise<any> | null = null
const getLooksSame = async (): Promise<any> => {
  if (!looksSamePromise)
    looksSamePromise = import("looks-same").then((m) => m.default || m)
  return looksSamePromise
}

type SnapshotOptions = {
  update?: boolean
  forceUpdate?: boolean
  ignored?: string[]
  /** Enable generation of 3d preview snapshots */
  threeD?: boolean
  /** Only generate PCB snapshots */
  pcbOnly?: boolean
  /** Only generate schematic snapshots */
  schematicOnly?: boolean
  /** Snapshot only the specified files */
  filePaths?: string[]
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

export const snapshotProject = async ({
  update = false,
  forceUpdate = false,
  ignored = [],
  threeD = false,
  pcbOnly = false,
  schematicOnly = false,
  filePaths = [],
  onExit = (code) => process.exit(code),
  onError = (msg) => console.error(msg),
  onSuccess = (msg) => console.log(msg),
}: SnapshotOptions = {}) => {
  const projectDir = process.cwd()
  const ignore = [
    ...DEFAULT_IGNORED_PATTERNS,
    ...ignored.map(normalizeIgnorePattern),
  ]
  let files: string[] = []

  if (filePaths.length > 0) {
    files = filePaths.map((f) => path.resolve(projectDir, f))
  } else {
    const boardFiles = globbySync(["**/*.board.tsx", "**/*.circuit.tsx"], {
      cwd: projectDir,
      ignore,
    })
    files = boardFiles.map((f) => path.join(projectDir, f))
  }

  if (files.length === 0) {
    console.log(
      "No entrypoint found. Run 'tsci init' to bootstrap a basic project or specify a file with 'tsci snapshot <file>'",
    )
    return onExit(0)
  }

  const mismatches: string[] = []
  for (const file of files) {
    const { circuitJson } = await generateCircuitJson({ filePath: file })
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    const schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    const svg3d = threeD
      ? await convertCircuitJsonToSimple3dSvg(circuitJson)
      : null
    const snapDir = path.join(path.dirname(file), "__snapshots__")
    fs.mkdirSync(snapDir, { recursive: true })
    const base = path.basename(file).replace(/\.tsx$/, "")
    const snapshotPairs: Array<["pcb" | "schematic" | "3d", string]> = []
    const includePcb = pcbOnly || !schematicOnly
    const includeSchematic = schematicOnly || !pcbOnly

    if (includePcb) snapshotPairs.push(["pcb", pcbSvg])
    if (includeSchematic) snapshotPairs.push(["schematic", schSvg])
    if (threeD && svg3d) {
      snapshotPairs.push(["3d", svg3d])
    }

    for (const [type, svg] of snapshotPairs) {
      const snapPath = path.join(snapDir, `${base}-${type}.snap.svg`)
      const fileExists = fs.existsSync(snapPath)

      if (!fileExists) {
        fs.writeFileSync(snapPath, svg)
        console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
        continue
      }

      const existing = fs.readFileSync(snapPath, "utf-8")
      const looksSame = await getLooksSame()
      const result: any = await looksSame(
        Buffer.from(svg),
        Buffer.from(existing),
        {
          strict: false,
          tolerance: 2,
        },
      )

      if (update) {
        if (!result.equal || forceUpdate) {
          fs.writeFileSync(snapPath, svg)
          console.log("✅", kleur.gray(path.relative(projectDir, snapPath)))
        }
      } else {
        if (!result.equal) mismatches.push(snapPath)
      }
    }
  }

  if (update) {
    onSuccess("Created snapshots")
    return onExit(0)
  }

  if (mismatches.length > 0) {
    onError(
      `Snapshot mismatch:\n${mismatches.join("\n")}\n\nRun with --update to fix.`,
    )
    return onExit(1)
  }

  onSuccess("All snapshots match")
  return onExit(0)
}
