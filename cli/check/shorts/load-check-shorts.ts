import { execFile } from "node:child_process"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

export type CheckShortsModule = typeof import("@tscircuit/check-shorts")

export const CHECK_SHORTS_PACKAGE_NAME = "@tscircuit/check-shorts"
export const CHECK_SHORTS_CDN_BASE_URL =
  "https://jscdn.tscircuit.com/@tscircuit/check-shorts"
export const CHECK_SHORTS_PACKAGE_JSON_URL = `${CHECK_SHORTS_CDN_BASE_URL}/latest/package.json`

const execFileAsync = promisify(execFile)
const INSTALL_TIMEOUT_MS = 2 * 60_000
const FETCH_TIMEOUT_MS = 10_000

type InstallPackage = (options: {
  installDir: string
  tarballUrl: string
}) => Promise<void>

type LoadLatestCheckShortsOptions = {
  cacheDir?: string
  fetchFn?: typeof globalThis.fetch
  importModule?: (moduleUrl: string) => Promise<unknown>
  installPackage?: InstallPackage
}

type PackageJson = {
  exports?: unknown
  main?: string
  module?: string
  name?: string
  version?: string
}

const getCheckShortsTarballUrl = (version: string) =>
  `${CHECK_SHORTS_CDN_BASE_URL}/${version}.tgz`

const getDefaultCacheDir = () =>
  path.join(tmpdir(), "tscircuit-cli", "check-shorts")

const getPackageDir = (installDir: string) =>
  path.join(installDir, "node_modules", "@tscircuit", "check-shorts")

const getConditionalExport = (value: unknown): string | undefined => {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object") return undefined

  const conditions = value as Record<string, unknown>
  for (const condition of ["import", "node", "default"]) {
    const target = getConditionalExport(conditions[condition])
    if (target) return target
  }

  return undefined
}

const getPackageEntrypoint = async (installDir: string): Promise<string> => {
  const packageDir = getPackageDir(installDir)
  const packageJson = JSON.parse(
    await readFile(path.join(packageDir, "package.json"), "utf8"),
  ) as PackageJson
  const rootExport =
    packageJson.exports && typeof packageJson.exports === "object"
      ? (packageJson.exports as Record<string, unknown>)["."]
      : packageJson.exports
  const relativeEntrypoint =
    getConditionalExport(rootExport) ?? packageJson.module ?? packageJson.main

  if (!relativeEntrypoint) {
    throw new Error(
      `Installed ${CHECK_SHORTS_PACKAGE_NAME} package has no ESM entrypoint`,
    )
  }

  const entrypoint = path.resolve(packageDir, relativeEntrypoint)
  if (!entrypoint.startsWith(`${packageDir}${path.sep}`)) {
    throw new Error(
      `Installed ${CHECK_SHORTS_PACKAGE_NAME} entrypoint is outside its package directory`,
    )
  }

  await access(entrypoint)
  return entrypoint
}

const installPackageWithRuntimeManager: InstallPackage = async ({
  installDir,
}) => {
  if ("bun" in process.versions) {
    await execFileAsync(
      process.execPath,
      ["install", "--production", "--ignore-scripts"],
      {
        cwd: installDir,
        timeout: INSTALL_TIMEOUT_MS,
      },
    )
    return
  }

  await execFileAsync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: installDir,
      timeout: INSTALL_TIMEOUT_MS,
    },
  )
}

const isUsableInstall = async (installDir: string): Promise<boolean> => {
  try {
    await getPackageEntrypoint(installDir)
    return true
  } catch {
    return false
  }
}

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

const ensureVersionInstalled = async ({
  cacheDir,
  installPackage,
  version,
}: {
  cacheDir: string
  installPackage: InstallPackage
  version: string
}): Promise<string> => {
  const versionDir = path.join(cacheDir, version)
  if (await isUsableInstall(versionDir)) return getPackageEntrypoint(versionDir)

  await mkdir(cacheDir, { recursive: true })
  const versionDirExisted = await pathExists(versionDir)
  if (versionDirExisted && (await isUsableInstall(versionDir))) {
    return getPackageEntrypoint(versionDir)
  }
  if (versionDirExisted) {
    await rm(versionDir, { recursive: true, force: true })
  }
  const temporaryInstallDir = await mkdtemp(path.join(cacheDir, `.${version}-`))

  try {
    const tarballUrl = getCheckShortsTarballUrl(version)
    await writeFile(
      path.join(temporaryInstallDir, "package.json"),
      JSON.stringify(
        {
          private: true,
          dependencies: {
            [CHECK_SHORTS_PACKAGE_NAME]: tarballUrl,
          },
        },
        null,
        2,
      ),
    )
    await installPackage({
      installDir: temporaryInstallDir,
      tarballUrl,
    })
    await getPackageEntrypoint(temporaryInstallDir)

    try {
      await rename(temporaryInstallDir, versionDir)
    } catch (error) {
      if (!(await isUsableInstall(versionDir))) throw error
    }

    return getPackageEntrypoint(versionDir)
  } finally {
    await rm(temporaryInstallDir, { recursive: true, force: true })
  }
}

const fetchLatestVersion = async (
  fetchFn: typeof globalThis.fetch,
): Promise<string> => {
  const response = await fetchFn(CHECK_SHORTS_PACKAGE_JSON_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to resolve the latest ${CHECK_SHORTS_PACKAGE_NAME}: ${response.status} ${response.statusText}`,
    )
  }

  const packageJson = (await response.json()) as PackageJson
  if (packageJson.name !== CHECK_SHORTS_PACKAGE_NAME) {
    throw new Error(
      `Latest checker metadata returned unexpected package ${packageJson.name ?? "(unknown)"}`,
    )
  }
  if (
    !packageJson.version ||
    packageJson.version.length > 128 ||
    !/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/.test(packageJson.version)
  ) {
    throw new Error("Latest checker metadata returned an invalid version")
  }

  return packageJson.version
}

const assertCheckShortsModule: (
  loadedModule: unknown,
) => asserts loadedModule is CheckShortsModule = (loadedModule) => {
  const candidate = loadedModule as Partial<CheckShortsModule> | undefined
  const requiredExports = [
    "appendBitmapLegend",
    "createShortDebugSvg",
    "encodeRgbaPng",
    "renderBitmapShortDebug",
  ] as const

  if (
    !candidate ||
    requiredExports.some(
      (exportName) => typeof candidate[exportName] !== "function",
    )
  ) {
    throw new Error(
      `Latest ${CHECK_SHORTS_PACKAGE_NAME} package is missing required exports`,
    )
  }
}

export const loadLatestCheckShorts = async (
  options: LoadLatestCheckShortsOptions = {},
): Promise<CheckShortsModule> => {
  const version = await fetchLatestVersion(options.fetchFn ?? globalThis.fetch)
  const entrypoint = await ensureVersionInstalled({
    cacheDir: options.cacheDir ?? getDefaultCacheDir(),
    installPackage: options.installPackage ?? installPackageWithRuntimeManager,
    version,
  })
  const moduleUrl = pathToFileURL(entrypoint).href
  const loadedModule = await (
    options.importModule ?? ((url: string) => import(url))
  )(moduleUrl)
  assertCheckShortsModule(loadedModule)
  return loadedModule
}

const importPackagedCheckShorts = async (): Promise<CheckShortsModule> =>
  await import("@tscircuit/check-shorts")

export const loadCheckShorts = async (
  options: {
    loadFallback?: () => Promise<CheckShortsModule>
    loadLatest?: () => Promise<CheckShortsModule>
    preferCdn?: boolean
  } = {},
): Promise<CheckShortsModule> => {
  const preferCdn =
    options.preferCdn ??
    (process.env.NODE_ENV !== "test" && process.env.TSCI_TEST_MODE !== "true")

  if (!preferCdn) {
    return (options.loadFallback ?? importPackagedCheckShorts)()
  }

  try {
    return await (options.loadLatest ?? loadLatestCheckShorts)()
  } catch (cdnError) {
    try {
      return await (options.loadFallback ?? importPackagedCheckShorts)()
    } catch (packageError) {
      throw new AggregateError(
        [cdnError, packageError],
        `Failed to load the latest or packaged ${CHECK_SHORTS_PACKAGE_NAME}`,
      )
    }
  }
}
