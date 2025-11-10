import path from "node:path"
import fs from "node:fs"
import { rollup } from "rollup"
import typescript from "@rollup/plugin-typescript"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import dts from "rollup-plugin-dts"
import kleur from "kleur"

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
      external: (id) => {
        // Mark all imports as external except relative imports
        return !id.startsWith(".") && !id.startsWith("/")
      },
      plugins: [
        resolve({
          extensions: [".ts", ".tsx", ".js", ".jsx"],
        }),
        commonjs(),
        typescript({
          jsx: "react",
          tsconfig: false,
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            jsx: "react",
            declaration: false,
            sourceMap: false,
            skipLibCheck: true,
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
      external: (id) => {
        // Mark all imports as external except relative imports
        return !id.startsWith(".") && !id.startsWith("/")
      },
      plugins: [
        resolve({
          extensions: [".ts", ".tsx", ".js", ".jsx"],
        }),
        commonjs(),
        typescript({
          jsx: "react",
          tsconfig: false,
          compilerOptions: {
            target: "ES2020",
            module: "CommonJS",
            jsx: "react",
            declaration: false,
            sourceMap: false,
            skipLibCheck: true,
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
      external: (id) => {
        // Mark all imports as external except relative imports
        return !id.startsWith(".") && !id.startsWith("/")
      },
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