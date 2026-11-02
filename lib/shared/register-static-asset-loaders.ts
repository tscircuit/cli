import fs from "node:fs"
import { register } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { PlatformConfig } from "@tscircuit/props"

const STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".obj",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym",
]

const staticAssetFilter = new RegExp(
  `(${STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join(
    "|",
  )})$`,
  "i",
)

let registered = false
let activePlatformConfig: PlatformConfig | undefined

const TEXT_STATIC_ASSET_EXTENSIONS = new Set([
  ".json",
  ".txt",
  ".md",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym",
])

const readFileContentForStaticLoader = (
  filePath: string,
): string | ArrayBufferLike => {
  const ext = path.extname(filePath).toLowerCase()

  if (TEXT_STATIC_ASSET_EXTENSIONS.has(ext)) {
    return fs.readFileSync(filePath, "utf-8")
  }

  const buffer = fs.readFileSync(filePath)
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

const getStaticFileLoader = (filePath: string) => {
  const extWithDot = path.extname(filePath).toLowerCase()
  const ext = extWithDot.replace(/^\./, "")
  return (
    activePlatformConfig?.staticFileLoaderMap?.[ext] ??
    activePlatformConfig?.staticFileLoaderMap?.[extWithDot]
  )
}

const normalizeStaticFileLoaderResult = (result: any) => {
  if (result && typeof result === "object" && result.__esModule) {
    return result
  }

  return {
    __esModule: true,
    default: result,
  }
}

/**
 * Finds and reads the tsconfig.json file, returning the baseUrl if configured.
 * Returns null if no tsconfig.json is found or no baseUrl is set.
 */
const getBaseUrlFromTsConfig = (projectDir: string): string | null => {
  const tsconfigPath = path.join(projectDir, "tsconfig.json")

  try {
    if (!fs.existsSync(tsconfigPath)) {
      return null
    }

    const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
    const tsconfig = JSON.parse(tsconfigContent)

    if (tsconfig.compilerOptions?.baseUrl) {
      return tsconfig.compilerOptions.baseUrl
    }
  } catch {
    // Ignore errors reading/parsing tsconfig
  }

  return null
}

export const registerStaticAssetLoaders = (
  platformConfig?: PlatformConfig,
  projectDir = process.cwd(),
) => {
  activePlatformConfig = platformConfig

  if (registered) return
  registered = true

  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
    const baseUrl = getBaseUrlFromTsConfig(projectDir)

    Bun.plugin({
      name: "tsci-static-assets",
      setup(build) {
        build.onLoad({ filter: staticAssetFilter }, async (args) => {
          const staticFileLoader = getStaticFileLoader(args.path)
          if (staticFileLoader) {
            const loaderExports = normalizeStaticFileLoaderResult(
              await staticFileLoader(readFileContentForStaticLoader(args.path)),
            )

            return {
              exports: loaderExports,
              loader: "object",
            }
          }

          const baseDir = baseUrl
            ? path.resolve(projectDir, baseUrl)
            : projectDir

          const relativePath = path
            .relative(baseDir, args.path)
            .split(path.sep)
            .join("/")

          const pathStr = `./${relativePath}`

          // Return exports object with __esModule flag for proper ESM/CJS interop.
          // This fixes the issue where pre-built libraries that import .step files
          // would receive a Module object { default: "path" } instead of just the string.
          // The __esModule flag ensures proper default export resolution.
          return {
            exports: {
              __esModule: true,
              default: pathStr,
            },
            loader: "object",
          }
        })
      },
    })
    return
  }

  if (typeof register === "function") {
    const baseUrl = getBaseUrlFromTsConfig(projectDir)
    const defaultBaseDir = baseUrl
      ? path.resolve(projectDir, baseUrl)
      : projectDir
    const projectParentUrl = pathToFileURL(
      path.join(projectDir, "package.json"),
    ).href
    const cliParentUrl = import.meta.url

    const loaderSource = `
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const STATIC_ASSET_EXTENSIONS = new Set(${JSON.stringify(STATIC_ASSET_EXTENSIONS)});
const CODE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".mts", ".cts"]);
const RESOLVE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json"];
const INDEX_FILES = RESOLVE_EXTENSIONS.map((ext) => "index" + ext);
const defaultProjectDir = ${JSON.stringify(projectDir)};
const defaultBaseDir = ${JSON.stringify(defaultBaseDir)};
const projectParentUrl = ${JSON.stringify(projectParentUrl)};
const cliParentUrl = ${JSON.stringify(cliParentUrl)};

const cliRequire = createRequire(cliParentUrl);
const projectRequire = (() => {
  try {
    return createRequire(projectParentUrl);
  } catch {
    return cliRequire;
  }
})();

let tsModule;
function getTypeScript() {
  if (!tsModule) {
    try {
      tsModule = projectRequire("typescript");
    } catch {
      tsModule = cliRequire("typescript");
    }
  }
  return tsModule;
}

function tryResolveFileOrDir(candidatePath) {
  if (fs.existsSync(candidatePath)) {
    const stat = fs.statSync(candidatePath);
    if (stat.isFile()) return candidatePath;
    if (stat.isDirectory()) {
      for (const indexFile of INDEX_FILES) {
        const indexPath = path.join(candidatePath, indexFile);
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          return indexPath;
        }
      }
    }
  }
  if (candidatePath.endsWith(".js") || candidatePath.endsWith(".jsx")) {
    const stem = candidatePath.replace(/\\.jsx?$/, "");
    for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
      const alt = stem + ext;
      if (fs.existsSync(alt) && fs.statSync(alt).isFile()) {
        return alt;
      }
    }
  }
  for (const ext of RESOLVE_EXTENSIONS) {
    const withExt = candidatePath + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }
  return null;
}

function resolveBaseDirForAsset(assetPath) {
  let dir = path.dirname(assetPath);
  while (dir && dir !== path.dirname(dir)) {
    const tsconfigPath = path.join(dir, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
        if (parsed.compilerOptions?.baseUrl) {
          return path.resolve(dir, parsed.compilerOptions.baseUrl);
        }
      } catch {}
      return dir;
    }
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return defaultBaseDir;
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && err.url && err.code === "ERR_UNSUPPORTED_DIR_IMPORT") {
      const found = tryResolveFileOrDir(fileURLToPath(err.url));
      if (found) {
        return { url: pathToFileURL(found).href, shortCircuit: true };
      }
    }

    if (
      specifier.startsWith(".") ||
      specifier.startsWith("/") ||
      specifier.startsWith("file:")
    ) {
      const parentDir =
        context.parentURL && context.parentURL.startsWith("file:")
          ? path.dirname(fileURLToPath(context.parentURL))
          : defaultProjectDir;
      const targetBase = specifier.startsWith("file:")
        ? fileURLToPath(specifier)
        : path.resolve(parentDir, specifier);
      const found = tryResolveFileOrDir(targetBase);
      if (found) {
        return { url: pathToFileURL(found).href, shortCircuit: true };
      }
    } else if (!specifier.startsWith("node:") && !specifier.startsWith("data:")) {
      const localCandidate = tryResolveFileOrDir(
        path.resolve(defaultBaseDir, specifier),
      );
      if (localCandidate) {
        return { url: pathToFileURL(localCandidate).href, shortCircuit: true };
      }

      for (const fallbackParentUrl of [projectParentUrl, cliParentUrl]) {
        if (context.parentURL === fallbackParentUrl) continue;
        try {
          return await nextResolve(specifier, {
            ...context,
            parentURL: fallbackParentUrl,
          });
        } catch {}
      }

      for (const req of [projectRequire, cliRequire]) {
        try {
          return {
            url: pathToFileURL(req.resolve(specifier)).href,
            shortCircuit: true,
          };
        } catch {}
      }
    }

    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file://")) {
    const filePath = fileURLToPath(url);
    const ext = path.extname(filePath).toLowerCase();

    if (STATIC_ASSET_EXTENSIONS.has(ext)) {
      const baseDir = resolveBaseDirForAsset(filePath);
      const relativePath = path
        .relative(baseDir, filePath)
        .split(path.sep)
        .join("/");
      const pathStr = "./" + relativePath;
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export const __esModule = true;\\nexport default " +
          JSON.stringify(pathStr) +
          ";\\n",
      };
    }

    if (ext === ".json" && context.importAttributes?.type !== "json") {
      const rawJson = fs.readFileSync(filePath, "utf-8");
      return {
        format: "module",
        shortCircuit: true,
        source: "export default " + rawJson + ";\\n",
      };
    }

    if (CODE_EXTENSIONS.has(ext)) {
      const ts = getTypeScript();
      const rawSource = fs.readFileSync(filePath, "utf-8");
      const transpiled = ts.transpileModule(rawSource, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      });
      return {
        format: "module",
        shortCircuit: true,
        source: transpiled.outputText,
      };
    }
  }

  return nextLoad(url, context);
}
`

    register(
      `data:text/javascript,${encodeURIComponent(loaderSource)}`,
      cliParentUrl,
    )
  }
}
