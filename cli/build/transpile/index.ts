import path from "node:path"
import fs from "node:fs"
import { rollup } from "rollup"
import typescript from "@rollup/plugin-typescript"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import dts from "rollup-plugin-dts"
import kleur from "kleur"

import {
  createStaticAssetPlugin,
  STATIC_ASSET_EXTENSIONS,
} from "./static-asset-plugin"

const CLI_TYPES_ROOT = path.resolve(__dirname, "../../../types")

const createExternalFunction =
  (projectDir: string) =>
  (id: string): boolean => {
    if (id.startsWith(".") || id.startsWith("/")) {
      return false // Don't externalize relative paths
    }
    if (path.isAbsolute(id)) {
      return false // Don't externalize absolute file paths
    }

    // Check if this is a local project file (e.g., lib/src/MachinePin)
    const potentialPaths = [
      path.join(projectDir, id),
      path.join(projectDir, `${id}.ts`),
      path.join(projectDir, `${id}.tsx`),
      path.join(projectDir, `${id}.js`),
      path.join(projectDir, `${id}.jsx`),
      path.join(projectDir, id, "index.ts"),
      path.join(projectDir, id, "index.tsx"),
      path.join(projectDir, id, "index.js"),
      path.join(projectDir, id, "index.jsx"),
    ]

    if (potentialPaths.some((p) => fs.existsSync(p))) {
      return false
    }

    // Everything else (npm packages like 'react', '@rollup/plugin-foo', etc.) is external
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

    // Read project's tsconfig.json to get types, but validate they exist
    const tsconfigPath = path.join(projectDir, "tsconfig.json")
    const validTypes: string[] = []

    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
        const tsconfig = JSON.parse(tsconfigContent)

        if (tsconfig.compilerOptions?.types) {
          // For each type, check if it exists in @types or as a package
          for (const typeName of tsconfig.compilerOptions.types) {
            const typesPath = path.join(
              projectDir,
              "node_modules",
              "@types",
              typeName.replace(/^@/, "").replace(/\//g, "__"),
            )
            const packagePath = path.join(projectDir, "node_modules", typeName)

            // Include if it exists in @types OR if it's 'bun' (special case)
            if (fs.existsSync(typesPath) || typeName === "bun") {
              validTypes.push(typeName)
            }
            // For packages that ship their own types, include them if they exist
            // TypeScript will find them via typeRoots containing node_modules
            else if (fs.existsSync(packagePath)) {
              validTypes.push(typeName)
            }
          }
        }
      } catch (err) {
        // Ignore tsconfig parsing errors
      }
    }

    const typeRootCandidates = [
      path.join(projectDir, "node_modules", "@types"),
      path.join(projectDir, "types"),
      path.join(projectDir, "node_modules"), // Add node_modules as a typeRoot for packages with global augmentations
      CLI_TYPES_ROOT,
    ]
    const typeRoots = Array.from(
      new Set(
        typeRootCandidates.filter((candidate) => fs.existsSync(candidate)),
      ),
    )

    // Build ESM bundle
    console.log("Building ESM bundle...")
    const staticAssetExtensions = Array.from(STATIC_ASSET_EXTENSIONS)

    const getPlugins = () => [
      createStaticAssetPlugin({ outputDir, projectDir }),
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
        jsx: "react-jsx",
        tsconfig: false,
        compilerOptions: {
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
          ...(typeRoots.length ? { typeRoots } : {}),
          ...(validTypes.length ? { types: validTypes } : {}),
        },
      }),
    ]

    const externalFunction = createExternalFunction(projectDir)

    const esmBundle = await rollup({
      input,
      external: externalFunction,
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
      external: externalFunction,
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
      external: externalFunction,
      plugins: [
        resolve({
          extensions: [".ts", ".tsx", ".d.ts"],
        }),
        dts({
          respectExternal: true,
          compilerOptions: {
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
