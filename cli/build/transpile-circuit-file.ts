import fs from "node:fs"
import path from "node:path"
import kleur from "kleur"

type TranspileCircuitFileOptions = {
  inputPath: string
  outputDir: string
  projectDir: string
  ignoreWarnings?: boolean
}

const formatDiagnosticMessage = (
  ts: typeof import("typescript"),
  diagnostic: import("typescript").Diagnostic,
  sourceText: string,
  projectDir: string,
) => {
  const fileName = diagnostic.file?.fileName ?? diagnostic.source ?? ""
  const relativeFileName = fileName
    ? path.relative(projectDir, fileName)
    : "[unknown]"
  const sourceFile = diagnostic.file
    ? diagnostic.file
    : ts.createSourceFile(
        fileName || "transpile.tsx",
        sourceText,
        ts.ScriptTarget.Latest,
        true,
      )
  const position =
    diagnostic.start !== undefined
      ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
      : { line: 0, character: 0 }
  const location = fileName
    ? `${relativeFileName}:${position.line + 1}:${position.character + 1}`
    : relativeFileName
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")

  return `${location} - ${message}`
}

export const transpileCircuitFile = async ({
  inputPath,
  outputDir,
  projectDir,
  ignoreWarnings,
}: TranspileCircuitFileOptions): Promise<boolean> => {
  try {
    const ts = await import("typescript")
    const source = fs.readFileSync(inputPath, "utf8")

    // Check if @tscircuit/core types are available
    const tscircuitCoreTypesPath = path.join(
      projectDir,
      "node_modules",
      "@tscircuit",
      "core",
      "dist",
      "index.d.ts",
    )
    const hasTscircuitCoreTypes = fs.existsSync(tscircuitCoreTypesPath)

    // Simple compiler options - let TypeScript use standard React JSX runtime
    // @tscircuit/core already augments react/jsx-runtime with IntrinsicElements
    // We add @tscircuit/core to types array if available to load its type augmentations
    const baseCompilerOptions: import("typescript").CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "react",
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      skipLibCheck: true,
      types: hasTscircuitCoreTypes ? ["@tscircuit/core"] : undefined,
    }

    const seenDiagnosticKeys = new Set<string>()
    const collectedDiagnostics: import("typescript").Diagnostic[] = []

    const collectDiagnostics = (
      diagnostics: readonly import("typescript").Diagnostic[] | undefined,
    ) => {
      if (!diagnostics) return
      for (const diagnostic of diagnostics) {
        // Skip diagnostics from node_modules
        const fileName = diagnostic.file?.fileName ?? diagnostic.source ?? ""
        if (fileName.includes("node_modules")) {
          continue
        }

        const key = [
          fileName,
          diagnostic.start ?? "",
          diagnostic.code,
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        ].join("|")

        if (!seenDiagnosticKeys.has(key)) {
          seenDiagnosticKeys.add(key)
          collectedDiagnostics.push(diagnostic)
        }
      }
    }

    const esmResult = ts.transpileModule(source, {
      fileName: inputPath,
      reportDiagnostics: true,
      compilerOptions: {
        ...baseCompilerOptions,
        module: ts.ModuleKind.ESNext,
      },
    })

    collectDiagnostics(esmResult.diagnostics)

    const cjsResult = ts.transpileModule(source, {
      fileName: inputPath,
      reportDiagnostics: false,
      compilerOptions: {
        ...baseCompilerOptions,
        module: ts.ModuleKind.CommonJS,
      },
    })

    const declarationCompilerOptions: import("typescript").CompilerOptions = {
      ...baseCompilerOptions,
      module: ts.ModuleKind.ESNext,
      declaration: true,
      emitDeclarationOnly: true,
    }

    const declarationOutputs: Array<{ fileName: string; text: string }> = []
    const compilerHost = ts.createCompilerHost(declarationCompilerOptions)

    compilerHost.writeFile = (fileName, text) => {
      declarationOutputs.push({ fileName, text })
    }

    const program = ts.createProgram(
      [inputPath],
      declarationCompilerOptions,
      compilerHost,
    )

    collectDiagnostics(ts.getPreEmitDiagnostics(program))

    const emitResult = program.emit()
    collectDiagnostics(emitResult.diagnostics)

    let hasErrors = false

    // Error codes to skip when @tscircuit/core types aren't available:
    // 2875: This JSX tag requires the module path 'react/jsx-runtime' to exist
    // 2339: Property does not exist on type 'JSX.IntrinsicElements'
    // 2322: Type is not assignable (JSX props)
    // 2802: Type 'X' can only be used in TypeScript files (JSX runtime module not found)
    const jsxErrorCodesToSkip = hasTscircuitCoreTypes
      ? new Set<number>()
      : new Set([2875, 2339, 2322, 2802])

    for (const diagnostic of collectedDiagnostics) {
      // Skip JSX type errors when types aren't available - transpilation still works
      if (jsxErrorCodesToSkip.has(diagnostic.code)) {
        continue
      }

      const formattedMessage = formatDiagnosticMessage(
        ts,
        diagnostic,
        source,
        projectDir,
      )

      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        hasErrors = true
        console.error(kleur.red(`[transpile] ${formattedMessage}`))
      } else if (
        diagnostic.category === ts.DiagnosticCategory.Warning &&
        !ignoreWarnings
      ) {
        console.warn(kleur.yellow(`[transpile] ${formattedMessage}`))
      }
    }

    if (hasErrors) {
      return false
    }

    fs.mkdirSync(outputDir, { recursive: true })

    const esmOutputPath = path.join(outputDir, "index.js")
    fs.writeFileSync(esmOutputPath, esmResult.outputText, "utf8")

    const cjsOutputPath = path.join(outputDir, "index.cjs")
    fs.writeFileSync(cjsOutputPath, cjsResult.outputText, "utf8")

    const declarationOutput = declarationOutputs.find((output) =>
      output.fileName.endsWith(".d.ts"),
    )

    if (declarationOutput) {
      const dtsOutputPath = path.join(outputDir, "index.d.ts")
      fs.writeFileSync(dtsOutputPath, declarationOutput.text, "utf8")
    }

    console.log(
      `Transpiled outputs written to ${path.relative(projectDir, outputDir)}`,
    )

    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      kleur.red(
        `Failed to transpile ${path.relative(projectDir, inputPath)}: ${message}`,
      ),
    )
    return false
  }
}
