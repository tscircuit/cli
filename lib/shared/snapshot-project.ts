import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"

type SnapshotOptions = {
  update?: boolean
  ignored?: string[]
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

export const snapshotProject = async ({
  update = false,
  ignored = [],
  onExit = (code) => process.exit(code),
  onError = (msg) => console.error(msg),
  onSuccess = (msg) => console.log(msg),
}: SnapshotOptions = {}) => {
  const projectDir = process.cwd()
  const ignore = [
    ...DEFAULT_IGNORED_PATTERNS,
    ...ignored.map(normalizeIgnorePattern),
  ]
  const boardFiles = globbySync("**/*.board.tsx", { cwd: projectDir, ignore })
  let files = boardFiles.map((f) => path.join(projectDir, f))

  if (files.length === 0) {
    const entry = await getEntrypoint({
      projectDir,
      onError: onError,
      onSuccess: () => {},
    })
    if (!entry) return onExit(1)
    files = [entry]
  }

  const mismatches: string[] = []
  for (const file of files) {
    const { circuitJson } = await generateCircuitJson({ filePath: file })
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    const schSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    const snapDir = path.join(path.dirname(file), "__snapshots__")
    fs.mkdirSync(snapDir, { recursive: true })
    const base = path.basename(file).replace(/\.tsx$/, "")
    for (const [type, svg] of [
      ["pcb", pcbSvg],
      ["schematic", schSvg],
    ] as const) {
      const snapPath = path.join(snapDir, `${base}-${type}.snap.svg`)
      if (update || !fs.existsSync(snapPath)) {
        fs.writeFileSync(snapPath, svg)
      } else {
        const existing = fs.readFileSync(snapPath, "utf-8")
        if (existing !== svg) mismatches.push(snapPath)
      }
    }
  }

  if (update) {
    onSuccess("Created snapshots")
    return onExit(0)
  }

  if (mismatches.length > 0) {
    onError(`Snapshot mismatch:\n${mismatches.join("\n")}`)
    return onExit(1)
  }

  onSuccess("All snapshots match")
  return onExit(0)
}
