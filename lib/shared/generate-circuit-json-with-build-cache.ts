import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual } from "node:util"
import type { AnyCircuitElement } from "circuit-json"
import { z } from "zod"
import { resolve } from "import-meta-resolve"
import { categorizeErrorOrWarning } from "@tscircuit/circuit-json-util"
import pkg from "../../package.json"
import {
  findCircuitProjectDir,
  getSourceFilesystemMd5Hash,
} from "./circuit-json-build-cache"
import { generateCircuitJson } from "./generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "./get-platform-config-with-cli-defaults"
import { resolveFromUserLand } from "./importFromUserLand"
import { analyzeCircuitJson } from "./circuit-json-diagnostics"

type GenerationOptions = Parameters<typeof generateCircuitJson>[0]
type BuildCacheStatus = "hit" | "miss" | "disabled"
const CACHE_FORMAT_VERSION = 1
const GENERATED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".tscircuit",
])
const cachedBuildSchema = z.object({
  format_version: z.literal(CACHE_FORMAT_VERSION),
  input_hash: z.string(),
  circuit_json_sha256: z.string(),
  circuit_json: z.string(),
})

const hashText = (text: string) =>
  createHash("sha256").update(text).digest("hex")

function hashProjectFiles({
  directory,
  projectDir,
  hash,
}: {
  directory: string
  projectDir: string
  hash: ReturnType<typeof createHash>
}) {
  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name)
    if (GENERATED_DIRECTORIES.has(entry.name)) continue
    if (entry.isSymbolicLink())
      throw new Error("Linked project inputs require a fresh build")
    if (entry.isDirectory()) {
      hashProjectFiles({ directory: filePath, projectDir, hash })
    } else if (entry.isFile()) {
      const relativePath = path.relative(projectDir, filePath)
      const content = fs.readFileSync(filePath)
      hash.update(
        `${Buffer.byteLength(relativePath)}:${relativePath}${content.length}:`,
      )
      hash.update(content)
    }
  }
}

let cliIdentity: string | undefined
function getCliIdentity() {
  if (cliIdentity) return cliIdentity
  const modulePath = fileURLToPath(import.meta.url)
  const cliProjectDir = findCircuitProjectDir(modulePath)
  const hash = createHash("sha256")
    .update(pkg.version)
    .update(getSourceFilesystemMd5Hash(modulePath))
  const entrypoint = path.resolve(cliProjectDir, pkg.main)
  if (fs.existsSync(entrypoint)) hash.update(fs.readFileSync(entrypoint))
  cliIdentity = hash.digest("hex")
  return cliIdentity
}

function getBuildInputHash(options: GenerationOptions) {
  const projectDir = path.resolve(options.projectDir ?? process.cwd())
  const buildInputs = {
    platformConfig: options.platformConfig ?? null,
    injectedProps: options.injectedProps ?? null,
    environment: Object.fromEntries(
      Object.entries(process.env).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  }
  const serializedInputs = JSON.stringify(buildInputs)
  if (!isDeepStrictEqual(JSON.parse(serializedInputs), buildInputs)) {
    throw new Error("Non-JSON build options require a fresh build")
  }
  const hash = createHash("sha256")
    .update(String(CACHE_FORMAT_VERSION))
    .update(getCliIdentity())
    .update(process.version)
    .update(String(process.versions.bun))
    .update(path.resolve(projectDir, options.filePath))
    .update(serializedInputs)
  hashProjectFiles({ directory: projectDir, projectDir, hash })
  const tscircuitEntrypoint = resolveFromUserLand("tscircuit", projectDir)
  const coreEntrypoint = resolve("@tscircuit/core", tscircuitEntrypoint)
  for (const entrypoint of [tscircuitEntrypoint, coreEntrypoint]) {
    hash.update(entrypoint).update(fs.readFileSync(fileURLToPath(entrypoint)))
  }
  return hash.digest("hex")
}

function readCachedBuild({
  cachePath,
  inputHash,
}: { cachePath: string; inputHash: string }): AnyCircuitElement[] | null {
  try {
    const cached = cachedBuildSchema.parse(
      JSON.parse(fs.readFileSync(cachePath, "utf8")),
    )
    if (
      cached.input_hash !== inputHash ||
      hashText(cached.circuit_json) !== cached.circuit_json_sha256
    )
      return null
    // Preserve the producer's JSON verbatim, including fields from older core versions.
    const circuitJson: AnyCircuitElement[] = JSON.parse(cached.circuit_json)
    if (!Array.isArray(circuitJson)) return null
    return circuitJson
  } catch {
    return null
  }
}

export async function generateCircuitJsonWithBuildCache(
  options: GenerationOptions & { incremental?: boolean },
): Promise<{
  circuitJson: AnyCircuitElement[]
  cacheStatus: BuildCacheStatus
}> {
  let inputHash: string | undefined
  let cachePath: string | undefined
  if (
    options.incremental &&
    !options.autorouterDiagnostics?.enabled &&
    options.autorouterDiagnostics?.timeoutMs === undefined &&
    !options.solverDiagnostics?.enabled
  ) {
    try {
      inputHash = getBuildInputHash(options)
      const projectDir = path.resolve(options.projectDir ?? process.cwd())
      cachePath = path.join(
        projectDir,
        ".tscircuit",
        "build-cache",
        hashText(path.resolve(projectDir, options.filePath)) + ".json",
      )
      const circuitJson = readCachedBuild({ cachePath, inputHash })
      if (circuitJson) return { circuitJson, cacheStatus: "hit" }
    } catch {
      inputHash = undefined
      cachePath = undefined
    }
  }

  const { circuitJson } = await generateCircuitJson({
    ...options,
    platformConfig: getPlatformConfigWithCliDefaults(options.platformConfig, {
      projectDir: options.projectDir,
    }),
  })
  if (!inputHash || !cachePath) return { circuitJson, cacheStatus: "disabled" }
  const hasRenderFailure = analyzeCircuitJson(circuitJson).errors.some(
    (error) => {
      const category = categorizeErrorOrWarning(error)
      return category === "source" || category === "unknown"
    },
  )
  if (hasRenderFailure) return { circuitJson, cacheStatus: "disabled" }

  const temporaryPath = `${cachePath}.${randomUUID()}.tmp`
  try {
    if (getBuildInputHash(options) !== inputHash)
      return { circuitJson, cacheStatus: "disabled" }
    const serializedCircuitJson = JSON.stringify(circuitJson)
    fs.mkdirSync(path.dirname(cachePath), { recursive: true })
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify({
        format_version: CACHE_FORMAT_VERSION,
        input_hash: inputHash,
        circuit_json_sha256: hashText(serializedCircuitJson),
        circuit_json: serializedCircuitJson,
      }),
    )
    fs.renameSync(temporaryPath, cachePath)
  } catch {
    // Cache storage must not turn a completed build into a failure.
  } finally {
    try {
      fs.rmSync(temporaryPath, { force: true })
    } catch {}
  }
  return { circuitJson, cacheStatus: "miss" }
}
