import path from "node:path"
import fs from "node:fs"
import kleur from "kleur"

import {
  createStaticAssetPlugin,
  STATIC_ASSET_EXTENSIONS,
} from "./static-asset-plugin"

// The bundler stack (rollup plugins + the user's typescript install) is only
// needed when transpiling. Loading it lazily keeps `tsci` usable in projects
// whose typescript version cannot even be parsed by @rollup/plugin-typescript
// (e.g. the TypeScript 7 native port, which dropped ts.ModuleKind).
const loadBundlerDeps = async () => {
  const ts = (await import("typescript")).default
  const [typescriptMajor, typescriptMinor] = ts.versionMajorMinor
    .split(".")
    .map(Number)
  if (
    !Number.isFinite(typescriptMajor) ||
    typescriptMajor >= 6 ||
    ts.ModuleKind?.ES2015 === undefined
  ) {
    throw new Error(
      `Installed TypeScript ${ts.version} is not supported by the ` +
        `transpiler (@rollup/plugin-typescript requires TypeScript 5.x). ` +
        `Pin typescript@^5 in your project, e.g. \`bun add -D typescript@5\`.`,
    )
  }

  const [
    { rollup },
    { default: typescript },
    { default: resolve },
    { default: commonjs },
    { default: json },
    { default: dts },
  ] = await Promise.all([
    import("rollup"),
    import("@rollup/plugin-typescript"),
    import("@rollup/plugin-node-resolve"),
    import("@rollup/plugin-commonjs"),
    import("@rollup/plugin-json"),
    import("rollup-plugin-dts"),
  ])

  // TypeScript 5.7+ can emit projects that import .ts/.tsx paths by rewriting
  // those specifiers, instead of reporting TS5097 or requiring noEmit.
  const supportsRewriteRelativeImportExtensions =
    typescriptMajor > 5 || (typescriptMajor === 5 && typescriptMinor >= 7)
  const typescriptExtensionEmitOptions = supportsRewriteRelativeImportExtensions
    ? {
        allowImportingTsExtensions: true,
        rewriteRelativeImportExtensions: true,
      }
    : { allowImportingTsExtensions: false }

  return {
    rollup,
    typescript,
    resolve,
    commonjs,
    json,
    dts,
    typescriptExtensionEmitOptions,
  }
}

const createExternalFunction =
  (projectDir: string, tsconfigPath?: string) =>
  (id: string): boolean => {
    // Don't externalize relative or absolute paths (these are local files)
    if (id.startsWith(".") || id.startsWith("/") || path.isAbsolute(id)) {
      return false
    }

    // Read tsconfig to understand path mappings and baseUrl
    let baseUrl = projectDir
    let pathMappings: Record<string, string[]> = {}

    if (tsconfigPath && fs.existsSync(tsconfigPath)) {
      try {
        const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
        const tsconfig = JSON.parse(tsconfigContent)

        if (tsconfig.compilerOptions?.baseUrl) {
          baseUrl = path.resolve(
            path.dirname(tsconfigPath),
            tsconfig.compilerOptions.baseUrl,
          )
        }

        if (tsconfig.compilerOptions?.paths) {
          pathMappings = tsconfig.compilerOptions.paths
        }
      } catch {
        // Ignore tsconfig parsing errors
      }
    }

    // Check if this matches any path mapping pattern
    for (const [pattern, targets] of Object.entries(pathMappings)) {
      const patternWithoutWildcard = pattern.replace("/*", "/")
      if (id.startsWith(patternWithoutWildcard)) {
        return false // Path-mapped import, don't externalize
      }
    }

    // Check if this could be a baseUrl-relative import
    // Try to resolve it as a file relative to baseUrl
    const potentialPaths = [
      path.join(baseUrl, id),
      path.join(baseUrl, `${id}.ts`),
      path.join(baseUrl, `${id}.tsx`),
      path.join(baseUrl, `${id}.js`),
      path.join(baseUrl, `${id}.jsx`),
      path.join(baseUrl, id, "index.ts"),
      path.join(baseUrl, id, "index.tsx"),
      path.join(baseUrl, id, "index.js"),
      path.join(baseUrl, id, "index.jsx"),
    ]

    if (potentialPaths.some((p) => fs.existsSync(p))) {
      return false // This is a local file, don't externalize
    }

    // Everything else (npm packages like 'react', 'tscircuit', etc.) is external
    return true
  }

export const transpileFile = async ({
  input,
  outputDir,
  projectDir,
}: {
  input: string
  outputDir: string
  projectDir: string
}): Promise<boolean> => {
  try {
    fs.mkdirSync(outputDir, { recursive: true })

    const {
      rollup,
      typescript,
      resolve,
      commonjs,
      json,
      dts,
      typescriptExtensionEmitOptions,
    } = await loadBundlerDeps()

    // Check if user has a tsconfig.json
    const tsconfigPath = path.join(projectDir, "tsconfig.json")
    const hasTsConfig = fs.existsSync(tsconfigPath)
    let tsconfigBaseUrl = projectDir
    let tsconfigPathMappings: Record<string, string[]> | undefined

    if (hasTsConfig) {
      try {
        const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
        const tsconfig = JSON.parse(tsconfigContent)
        if (tsconfig.compilerOptions?.baseUrl) {
          tsconfigBaseUrl = path.resolve(
            path.dirname(tsconfigPath),
            tsconfig.compilerOptions.baseUrl,
          )
        }
        if (tsconfig.compilerOptions?.paths) {
          tsconfigPathMappings = tsconfig.compilerOptions.paths
        }
      } catch {
        // Ignore tsconfig parsing errors
      }
    }

    // Build ESM bundle
    console.log("Building ESM bundle...")
    const staticAssetExtensions = Array.from(STATIC_ASSET_EXTENSIONS)

    const getPlugins = () => [
      createStaticAssetPlugin({
        outputDir,
        projectDir,
        baseUrl: tsconfigBaseUrl,
        pathMappings: tsconfigPathMappings,
      }),
      resolve({
        extensions: [
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          ".json",
          ...staticAssetExtensions,
        ],
      }),
      commonjs(),
      json(),
      typescript({
        // Use user's tsconfig if available, otherwise use defaults
        tsconfig: hasTsConfig ? tsconfigPath : false,
        compilerOptions: hasTsConfig
          ? {
              declaration: false,
              sourceMap: false,
              noEmit: false,
              emitDeclarationOnly: false,
              ...typescriptExtensionEmitOptions,
            }
          : {
              target: "ES2020",
              module: "ESNext",
              jsx: "react-jsx",
              declaration: false,
              sourceMap: false,
              skipLibCheck: true,
              resolveJsonModule: true,
              allowSyntheticDefaultImports: true,
              allowArbitraryExtensions: true,
              baseUrl: projectDir,
              ...typescriptExtensionEmitOptions,
            },
      }),
    ]

    const esmBundle = await rollup({
      input,
      external: createExternalFunction(
        projectDir,
        hasTsConfig ? tsconfigPath : undefined,
      ),
      plugins: getPlugins(),
    })

    const esmOutputPath = path.join(outputDir, "index.js")

    await esmBundle.write({
      file: esmOutputPath,
      format: "es",
      sourcemap: false,
    })

    console.log(
      `ESM bundle written to ${path.relative(projectDir, esmOutputPath)}`,
    )
    // Build CommonJS bundle
    console.log("Building CommonJS bundle...")
    const cjsBundle = await rollup({
      input,
      external: createExternalFunction(
        projectDir,
        hasTsConfig ? tsconfigPath : undefined,
      ),
      plugins: getPlugins(),
    })

    const cjsOutputPath = path.join(outputDir, "index.cjs")
    console.log("Writing CJS bundle to:", cjsOutputPath)

    await cjsBundle.write({
      file: cjsOutputPath,
      format: "cjs",
      sourcemap: false,
    })

    console.log(
      `CommonJS bundle written to ${path.relative(projectDir, cjsOutputPath)}`,
    )

    // Build type declarations
    console.log("Generating type declarations...")
    const dtsBundle = await rollup({
      input,
      external: createExternalFunction(
        projectDir,
        hasTsConfig ? tsconfigPath : undefined,
      ),
      plugins: [
        resolve({
          extensions: [".ts", ".tsx", ".d.ts"],
        }),
        dts({
          respectExternal: true,
          tsconfig: hasTsConfig ? tsconfigPath : undefined,
          compilerOptions: hasTsConfig
            ? undefined
            : {
                baseUrl: projectDir,
              },
        }),
      ],
    })

    const dtsOutput = await dtsBundle.generate({
      format: "es",
    })

    // Post-process to simplify types (similar to reference implementation)
    let dtsContent = dtsOutput.output[0].code

    dtsContent = dtsContent.replace(
      /import \* as [\w_]+ from ['"]react\/jsx-runtime['"];?\s*\n?/g,
      "",
    )

    // Replace JSX.Element with any
    dtsContent = dtsContent.replace(/[\w_]+\.JSX\.Element/g, "any")

    // Remove empty exports (same as reference implementation)
    dtsContent = dtsContent.replace(/export\s*{\s*};\s*$/gm, "").trim()

    const dtsOutputPath = path.join(outputDir, "index.d.ts")
    fs.writeFileSync(dtsOutputPath, dtsContent)

    console.log(
      `Type declarations written to ${path.relative(projectDir, dtsOutputPath)}`,
    )

    console.log(kleur.green("Transpilation complete!"))
    return true
  } catch (err) {
    console.error(kleur.red(`Transpilation failed: ${err}`))
    if (err instanceof Error && err.stack) {
      console.error(err.stack)
    }
    return false
  }
}
