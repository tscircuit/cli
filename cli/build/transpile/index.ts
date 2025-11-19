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

const externalFunction = (id: string): boolean => {
  if (id.startsWith(".") || id.startsWith("/")) {
    return false // Don't externalize relative paths
  }
  if (path.isAbsolute(id)) {
    return false // Don't externalize absolute file paths
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
    // Normalize paths for cross-platform compatibility
    input = path.normalize(input)
    outputDir = path.normalize(outputDir)
    projectDir = path.normalize(projectDir)

    console.log("[DEBUG] Input file:", input)
    console.log("[DEBUG] Output directory:", outputDir)
    console.log("[DEBUG] Project directory:", projectDir)

    fs.mkdirSync(outputDir, { recursive: true })
    console.log("[DEBUG] Output directory created/verified:", outputDir)

    const typeRootCandidates = [
      path.join(projectDir, "node_modules", "@types"),
      path.join(projectDir, "types"),
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

    const getPlugins = (moduleKind: "ESNext" | "CommonJS") => [
      createStaticAssetPlugin({ outputDir }),
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
        jsx: "react",
        tsconfig: false,
        compilerOptions: {
          target: "ES2020",
          module: moduleKind,
          jsx: "react",
          declaration: false,
          sourceMap: false,
          skipLibCheck: true,
          resolveJsonModule: true,
          allowSyntheticDefaultImports: true,
          allowArbitraryExtensions: true,
          ...(typeRoots.length ? { typeRoots } : {}),
        },
      }),
    ]

    const esmBundle = await rollup({
      input,
      external: externalFunction,
      plugins: getPlugins("ESNext"),
    })

    const esmOutputPath = path.join(outputDir, "index.js")
    console.log("[DEBUG] Writing ESM bundle to:", esmOutputPath)

    await esmBundle.write({
      file: esmOutputPath,
      format: "es",
      sourcemap: false,
    })

    console.log("[DEBUG] ESM write completed")
    console.log("[DEBUG] Checking if ESM file exists:", fs.existsSync(esmOutputPath))
    if (fs.existsSync(esmOutputPath)) {
      const stats = fs.statSync(esmOutputPath)
      console.log("[DEBUG] ESM file size:", stats.size, "bytes")
    }

    console.log(
      `ESM bundle written to ${path.relative(projectDir, esmOutputPath)}`,
    )

    // Build CommonJS bundle
    console.log("Building CommonJS bundle...")
    const cjsBundle = await rollup({
      input,
      external: externalFunction,
      plugins: getPlugins("CommonJS"),
    })

    const cjsOutputPath = path.join(outputDir, "index.cjs")
    console.log("[DEBUG] Writing CJS bundle to:", cjsOutputPath)

    await cjsBundle.write({
      file: cjsOutputPath,
      format: "cjs",
      sourcemap: false,
    })

    console.log("[DEBUG] CJS write completed")
    console.log("[DEBUG] Checking if CJS file exists:", fs.existsSync(cjsOutputPath))
    if (fs.existsSync(cjsOutputPath)) {
      const stats = fs.statSync(cjsOutputPath)
      console.log("[DEBUG] CJS file size:", stats.size, "bytes")
    }

    console.log(
      `CommonJS bundle written to ${path.relative(projectDir, cjsOutputPath)}`,
    )

    // Build type declarations
    console.log("Generating type declarations...")
    const dtsBundle = await rollup({
      input,
      external: externalFunction,
      plugins: [
        dts({
          respectExternal: true,
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
    console.log("[DEBUG] Writing type declarations to:", dtsOutputPath)
    fs.writeFileSync(dtsOutputPath, dtsContent)
    console.log("[DEBUG] Type declarations write completed")
    console.log("[DEBUG] Checking if DTS file exists:", fs.existsSync(dtsOutputPath))
    if (fs.existsSync(dtsOutputPath)) {
      const stats = fs.statSync(dtsOutputPath)
      console.log("[DEBUG] DTS file size:", stats.size, "bytes")
    }

    console.log(
      `Type declarations written to ${path.relative(projectDir, dtsOutputPath)}`,
    )

    // Final debug: list all files in output directory
    console.log("[DEBUG] Listing files in output directory:")
    const filesInOutputDir = fs.readdirSync(outputDir)
    for (const file of filesInOutputDir) {
      const filePath = path.join(outputDir, file)
      const stats = fs.statSync(filePath)
      console.log(`[DEBUG]   - ${file} (${stats.size} bytes)`)
    }

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
