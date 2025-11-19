import path from "node:path"
import fs from "node:fs"
import { rollup } from "rollup"
import typescript from "@rollup/plugin-typescript"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import dts from "rollup-plugin-dts"
import kleur from "kleur"

// Shared external function for rollup configuration
// Mark all imports as external except:
// - Relative imports starting with . or /
// - Absolute file system paths (detected by path.isAbsolute)
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
    fs.mkdirSync(outputDir, { recursive: true })

    // Build ESM bundle
    console.log("Building ESM bundle...")
    const esmBundle = await rollup({
      input,
      external: externalFunction,
      plugins: [
        resolve({
          extensions: [".ts", ".tsx", ".js", ".jsx"],
        }),
        commonjs(),
        json(),
        typescript({
          jsx: "react",
          tsconfig: false,
          noForceEmit: true,
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            jsx: "react",
            declaration: false,
            sourceMap: false,
            skipLibCheck: true,
            resolveJsonModule: true,
            allowSyntheticDefaultImports: true,
            noEmit: false,
          },
        }),
      ],
    })

    await esmBundle.write({
      file: path.join(outputDir, "index.js"),
      format: "es",
      sourcemap: false,
    })

    console.log(
      `ESM bundle written to ${path.relative(projectDir, path.join(outputDir, "index.js"))}`,
    )

    // Build CommonJS bundle
    console.log("Building CommonJS bundle...")
    const cjsBundle = await rollup({
      input,
      external: externalFunction,
      plugins: [
        resolve({
          extensions: [".ts", ".tsx", ".js", ".jsx"],
        }),
        commonjs(),
        json(),
        typescript({
          jsx: "react",
          tsconfig: false,
          noForceEmit: true,
          compilerOptions: {
            target: "ES2020",
            module: "CommonJS",
            jsx: "react",
            declaration: false,
            sourceMap: false,
            skipLibCheck: true,
            resolveJsonModule: true,
            allowSyntheticDefaultImports: true,
            noEmit: false,
          },
        }),
      ],
    })

    await cjsBundle.write({
      file: path.join(outputDir, "index.cjs"),
      format: "cjs",
      sourcemap: false,
    })

    console.log(
      `CommonJS bundle written to ${path.relative(projectDir, path.join(outputDir, "index.cjs"))}`,
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

    fs.writeFileSync(path.join(outputDir, "index.d.ts"), dtsContent)

    console.log(
      `Type declarations written to ${path.relative(projectDir, path.join(outputDir, "index.d.ts"))}`,
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
