import { build } from "tsup"
import path from "node:path"
import fs from "node:fs"
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

    console.log("Building ESM bundle...")
    console.log("Building CommonJS bundle...")

    // Build ESM and CJS bundles using tsup
    await build({
      entry: { index: input },
      outDir: outputDir,
      format: ["esm", "cjs"],
      dts: false, // Skip DTS for now - requires typescript in project
      clean: false,
      sourcemap: false,
      splitting: false,
      external: [/^[^./]|^\.[^./]|^\.\.[^/]/], // Mark all non-relative imports as external
      esbuildOptions(options) {
        options.jsx = "transform"
        options.jsxFactory = "React.createElement"
        options.jsxFragment = "React.Fragment"
      },
      outExtension({ format }) {
        return {
          js: format === "esm" ? ".js" : ".cjs",
        }
      },
    })

    // Generate a simple .d.ts file (Like in prod all the d.ts files are this)
    console.log("Generating type declarations...")
    const dtsContent = `declare const _default: () => any;\nexport { _default as default };\n`
    fs.writeFileSync(path.join(outputDir, "index.d.ts"), dtsContent)

    console.log(
      `ESM bundle written to ${path.relative(projectDir, path.join(outputDir, "index.js"))}`,
    )
    console.log(
      `CommonJS bundle written to ${path.relative(projectDir, path.join(outputDir, "index.cjs"))}`,
    )
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
