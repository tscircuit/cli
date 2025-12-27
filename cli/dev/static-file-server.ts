import * as fs from "node:fs"
import * as path from "node:path"
import { globbySync } from "globby"
import kleur from "kleur"
import { DEFAULT_IGNORED_PATTERNS } from "lib/shared/should-ignore-path"
import type { StaticBuildFileReference } from "lib/site/getStaticIndexHtmlFile"
import { createHttpServer } from "lib/server/createHttpServer"
import { getVersion } from "lib/getVersion"

const CIRCUIT_JSON_GLOBS = ["**/*.circuit.json", "**/circuit.json"]

export const isCircuitJsonFile = (filePath: string): boolean =>
  filePath.endsWith(".circuit.json") ||
  path.basename(filePath).toLowerCase() === "circuit.json"

export const getStaticBuildFileReferences = (
  directory: string,
): StaticBuildFileReference[] => {
  const files = globbySync(CIRCUIT_JSON_GLOBS, {
    cwd: directory,
    ignore: DEFAULT_IGNORED_PATTERNS,
  }).sort()

  return files.map((filePath) => {
    const normalizedPath = filePath.split(path.sep).join("/")
    return {
      filePath: normalizedPath,
      fileStaticAssetUrl: `/${encodeURI(normalizedPath)}`,
    }
  })
}

export const getStaticBuildInfoFromPath = (
  absolutePath: string,
): { directory: string; files: StaticBuildFileReference[] } | null => {
  if (!fs.existsSync(absolutePath)) {
    return null
  }

  const stats = fs.statSync(absolutePath)

  if (stats.isDirectory()) {
    return {
      directory: absolutePath,
      files: getStaticBuildFileReferences(absolutePath),
    }
  }

  if (isCircuitJsonFile(absolutePath)) {
    const directory = path.dirname(absolutePath)
    const relativePath = path
      .relative(directory, absolutePath)
      .split(path.sep)
      .join("/")
    return {
      directory,
      files: [
        {
          filePath: relativePath,
          fileStaticAssetUrl: `/${encodeURI(relativePath)}`,
        },
      ],
    }
  }

  return null
}

export const startStaticFileServer = async (opts: {
  port: number
  directory: string
  files: StaticBuildFileReference[]
  startTime: number
}): Promise<void> => {
  const { port, directory, files, startTime } = opts

  if (files.length === 0) {
    console.error(`Error: No Circuit JSON files found in ${directory}`)
    return
  }

  await createHttpServer({
    port,
    staticBuild: {
      assetsDir: directory,
      files,
    },
  })

  const timeToStart = Date.now() - startTime

  console.log(
    `\n\n  ${kleur.green(`@tscircuit/cli@${getVersion()}`)} ${kleur.gray("ready in")} ${kleur.white(`${Math.round(timeToStart)}ms`)}`,
  )
  console.log(
    `\n  ${kleur.bold("➜ Local:")}   ${kleur.underline(kleur.cyan(`http://localhost:${port}`))}\n\n`,
  )
  console.log(
    kleur.gray(
      `Serving Circuit JSON files from ${kleur.underline(directory.split(path.sep).slice(-2).join(path.sep)!)}`,
    ),
  )
}
