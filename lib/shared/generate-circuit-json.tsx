import { getVirtualFileSystemFromDirPath } from "make-vfs"
import path from "node:path"
import fs from "node:fs"
import crypto from "node:crypto"
import { pathToFileURL } from "node:url"
import Debug from "debug"
import type { PlatformConfig } from "@tscircuit/props"
import { abbreviateStringifyObject } from "lib/utils/abbreviate-stringify-object"
import { importFromUserLand } from "./importFromUserLand"
import * as esbuild from "esbuild"

const debug = Debug("tsci:generate-circuit-json")

const ALLOWED_FILE_EXTENSIONS = [
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  ".txt",
  ".md",
  ".obj",
]

type GenerateCircuitJsonOptions = {
  filePath: string
  outputDir?: string
  outputFileName?: string
  saveToFile?: boolean
  platformConfig?: PlatformConfig
}

const SUPPORTED_TEXT_LOADERS = {
  ".txt": "text",
  ".md": "text",
  ".obj": "text",
} as const satisfies Record<string, esbuild.Loader>

const findNearestTsconfig = (startDir: string): string | undefined => {
  let currentDir = startDir

  while (true) {
    const candidate = path.join(currentDir, "tsconfig.json")
    if (fs.existsSync(candidate)) {
      return candidate
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  return undefined
}

const bundleEntrypointWithEsbuild = async ({
  entryFilePath,
  projectDir,
}: {
  entryFilePath: string
  projectDir: string
}) => {
  const tsconfigPath = findNearestTsconfig(path.dirname(entryFilePath))
  const cacheDir = path.join(projectDir, ".tsci", "cache")
  fs.mkdirSync(cacheDir, { recursive: true })
  const normalizedName = path
    .relative(projectDir, entryFilePath)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
  const bundleFilePath = path.join(
    cacheDir,
    `${normalizedName || "entrypoint"}-${crypto.randomUUID()}.mjs`,
  )

  await esbuild.build({
    entryPoints: [entryFilePath],
    outfile: bundleFilePath,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "esnext",
    jsx: "automatic",
    jsxImportSource: "react",
    sourcemap: false,
    absWorkingDir: projectDir,
    packages: "external",
    tsconfig: tsconfigPath,
    logLevel: "silent",
    loader: {
      ".json": "json",
      ...SUPPORTED_TEXT_LOADERS,
    },
  })

  return bundleFilePath
}

/**
 * Generates circuit JSON from a TSCircuit component file
 *
 * @param options Configuration options
 * @returns The generated circuit JSON object
 */
export async function generateCircuitJson({
  filePath,
  outputDir,
  outputFileName,
  saveToFile = false,
  platformConfig,
}: GenerateCircuitJsonOptions) {
  debug(`Generating circuit JSON for ${filePath}`)

  // Import React and make it globally available for packages referencing it
  const React = await importFromUserLand("react")
  ;(globalThis as any).React = React
  const userLandTscircuit = await importFromUserLand("tscircuit")

  const runner = new userLandTscircuit.RootCircuit({
    platform: platformConfig,
  })
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)
  const projectDir = path.dirname(absoluteFilePath)
  const resolvedOutputDir = outputDir ?? projectDir

  // Get the relative path to the component from the project directory
  const relativeComponentPath = path.relative(projectDir, absoluteFilePath)

  // Create a default output filename if not provided
  const baseFileName =
    outputFileName || path.basename(absoluteFilePath).replace(/\.[^.]+$/, "")
  const outputPath = path.join(
    resolvedOutputDir,
    `${baseFileName}.circuit.json`,
  )

  debug(`Project directory: ${projectDir}`)
  debug(`Relative component path: ${relativeComponentPath}`)
  debug(`Output path: ${outputPath}`)

  // Create a virtual file system with the project files
  const fsMap = {
    ...((await getVirtualFileSystemFromDirPath({
      dirPath: projectDir,
      fileMatchFn: (filePath) => {
        const normalizedFilePath = filePath.replace(/\\/g, "/")
        if (normalizedFilePath.includes("node_modules/")) return false
        if (normalizedFilePath.includes("dist/")) return false
        if (normalizedFilePath.includes("build/")) return false
        if (normalizedFilePath.match(/^\.[^/]/)) return false
        if (!ALLOWED_FILE_EXTENSIONS.includes(path.extname(normalizedFilePath)))
          return false
        return true
      },
      contentFormat: "string",
    })) as Record<string, string>),
  }

  debug(`fsMap: ${abbreviateStringifyObject(fsMap)}`)

  // Execute the circuit runner with the virtual file system
  const bundledEntrypointPath = await bundleEntrypointWithEsbuild({
    entryFilePath: absoluteFilePath,
    projectDir,
  })
  const MainComponent = await import(pathToFileURL(bundledEntrypointPath).href)

  // Handle both default export and named exports
  const Component =
    MainComponent.default ||
    (Object.keys(MainComponent).find((k) => k[0] === k[0].toUpperCase()) !==
    undefined
      ? MainComponent[
          Object.keys(MainComponent).find(
            (k) => k[0] === k[0].toUpperCase(),
          ) as keyof typeof MainComponent
        ]
      : undefined)

  if (!Component) {
    throw new Error(
      `No component found in "${absoluteFilePath}". Make sure you export a component.`,
    )
  }

  runner.add(<Component />)

  // Wait for the circuit to be fully rendered
  await runner.renderUntilSettled()

  // Get the circuit JSON
  const circuitJson = await runner.getCircuitJson()

  // Save the circuit JSON to a file if requested
  if (saveToFile) {
    debug(`Saving circuit JSON to ${outputPath}`)
    fs.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2))
  }

  return {
    circuitJson,
    outputPath,
  }
}
