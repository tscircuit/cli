import { fp as bundledFp } from "@tscircuit/footprinter"
import type { AnyCircuitElement } from "circuit-json"
import { loadFootprintFile } from "cli/convert/load-circuit-json-for-footprinter"
import { resolve as resolveModule } from "import-meta-resolve"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

export type FootprintInputKind =
  | "file"
  | "footprint_library"
  | "footprinter_string"

export interface LoadedFootprint {
  input: string
  kind: FootprintInputKind
  /** One line saying where the footprint came from. */
  sourceDescription: string
  circuitJson: AnyCircuitElement[]
  declaredFootprinterString?: string
  /** How footprinter parsed the string; only for footprinter strings. */
  parameters?: Record<string, unknown>
}

type FootprinterModule = { fp: typeof bundledFp }

const FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".json", ".kicad_mod"]
const LIBRARY_FOOTPRINT_PATTERN = /^([a-z][a-z0-9_-]*):(.+)$/i

/**
 * Prefer the project's own footprinter so the pads match what `tsci build`
 * will place. The copy bundled with the CLI can be a different version.
 */
const loadFootprinter = async (
  projectDir: string,
): Promise<{ fp: typeof bundledFp; isFromProject: boolean }> => {
  try {
    const resolved = resolveModule(
      "@tscircuit/footprinter",
      pathToFileURL(path.join(projectDir, "noop.js")).href,
    )
    const mod = (await import(resolved)) as FootprinterModule
    if (typeof mod.fp?.string === "function") {
      return { fp: mod.fp, isFromProject: true }
    }
  } catch {
    // Not installed in the project; fall through to the bundled copy.
  }
  return { fp: bundledFp, isFromProject: false }
}

const loadLibraryFootprint = async ({
  input,
  library,
  footprintName,
  projectDir,
}: {
  input: string
  library: string
  footprintName: string
  projectDir: string
}): Promise<LoadedFootprint> => {
  const platformConfig = getPlatformConfigWithCliDefaults(undefined, {
    projectDir,
  })
  const footprintLibraryMap = (platformConfig.footprintLibraryMap ??
    {}) as Record<string, unknown>
  const resolver = footprintLibraryMap[library]
  if (typeof resolver !== "function") {
    const available = Object.keys(footprintLibraryMap)
      .filter((key) => typeof footprintLibraryMap[key] === "function")
      .map((key) => `${key}:`)
    throw new Error(
      `Unknown footprint library "${library}:". Available libraries: ${available.join(", ")}`,
    )
  }
  const result = (await resolver(footprintName)) as {
    footprintCircuitJson?: AnyCircuitElement[]
  }
  if (!Array.isArray(result?.footprintCircuitJson)) {
    throw new Error(`The "${library}:" library returned no footprint`)
  }
  return {
    input,
    kind: "footprint_library",
    sourceDescription: `${library} footprint library`,
    circuitJson: result.footprintCircuitJson,
  }
}

export const loadFootprintForInspection = async (
  pathOrString: string,
): Promise<LoadedFootprint> => {
  const input = pathOrString.trim()
  if (!input) throw new Error("No footprint path or string was given")

  const inputPath = path.resolve(input)
  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()) {
    return {
      input,
      kind: "file",
      sourceDescription: `file ${path.relative(process.cwd(), inputPath) || inputPath}`,
      ...(await loadFootprintFile(inputPath)),
    }
  }

  const projectDir = findCircuitProjectDir(
    path.join(process.cwd(), "index.tsx"),
  )

  const libraryMatch = input.match(LIBRARY_FOOTPRINT_PATTERN)
  if (libraryMatch) {
    return loadLibraryFootprint({
      input,
      library: libraryMatch[1]!.toLowerCase(),
      footprintName: libraryMatch[2]!,
      projectDir,
    })
  }

  const looksLikeFilePath =
    input.includes("/") ||
    input.includes("\\") ||
    FILE_EXTENSIONS.some((extension) => input.toLowerCase().endsWith(extension))
  if (looksLikeFilePath) {
    throw new Error(`File not found: ${inputPath}`)
  }

  const { fp, isFromProject } = await loadFootprinter(projectDir)
  let builder: ReturnType<typeof bundledFp.string>
  try {
    builder = fp.string(input)
    return {
      input,
      kind: "footprinter_string",
      declaredFootprinterString: input,
      sourceDescription: `footprinter string (${
        isFromProject
          ? "@tscircuit/footprinter installed in this project"
          : "@tscircuit/footprinter bundled with the CLI"
      })`,
      circuitJson: builder.circuitJson() as AnyCircuitElement[],
      parameters: { ...builder.json() },
    }
  } catch (error) {
    throw new Error(
      `"${input}" is not an existing file, a library footprint such as "kicad:Resistor_SMD/R_0402_1005Metric", or a valid footprinter string. ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}
