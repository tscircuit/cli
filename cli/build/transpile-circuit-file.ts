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

    const typeRoots = [
      path.join(projectDir, "types"),
      path.join(projectDir, "node_modules", "@types"),
    ].filter((dir) => fs.existsSync(dir))

    const jsxRuntimeModulePath = path.join(
      projectDir,
      "types",
      "tscircuit",
      "jsx-runtime",
    )

    const paths: Record<string, string[]> | undefined = fs.existsSync(
      `${jsxRuntimeModulePath}.d.ts`,
    )
      ? {
          "tscircuit/jsx-runtime": [
            path.relative(projectDir, jsxRuntimeModulePath),
          ],
        }
      : undefined

    const baseCompilerOptions: import("typescript").CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "tscircuit",
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      typeRoots: typeRoots.length > 0 ? typeRoots : undefined,
      baseUrl: projectDir,
      paths,
    }

    const seenDiagnosticKeys = new Set<string>()
    const collectedDiagnostics: import("typescript").Diagnostic[] = []

    const collectDiagnostics = (
      diagnostics: readonly import("typescript").Diagnostic[] | undefined,
    ) => {
      if (!diagnostics) return
      for (const diagnostic of diagnostics) {
        const key = [
          diagnostic.file?.fileName ?? diagnostic.source ?? "",
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
      noResolve: true,
    }

    const declarationOutputs: Array<{ fileName: string; text: string }> = []
    const compilerHost = ts.createCompilerHost(declarationCompilerOptions)
    const jsxRuntimeDeclarationPath = `${jsxRuntimeModulePath}.d.ts`
    const moduleResolutionCache = ts.createModuleResolutionCache(
      projectDir,
      compilerHost.getCanonicalFileName,
      declarationCompilerOptions,
    )

    const resolveJsxRuntime = () =>
      fs.existsSync(jsxRuntimeDeclarationPath)
        ? {
            resolvedFileName: jsxRuntimeDeclarationPath,
            extension: ts.Extension.Dts,
            isExternalLibraryImport: false,
          }
        : undefined

    const originalResolveModuleNameLiterals =
      compilerHost.resolveModuleNameLiterals?.bind(compilerHost)

    compilerHost.resolveModuleNameLiterals = (
      moduleLiterals,
      containingFile,
      redirectedReference,
      options,
      containingSourceFile,
      reusedNames,
    ) => {
      const fallbackResolutions = originalResolveModuleNameLiterals
        ? originalResolveModuleNameLiterals(
            moduleLiterals,
            containingFile,
            redirectedReference,
            options,
            containingSourceFile,
            reusedNames,
          )
        : []

      return moduleLiterals.map((moduleLiteral, index) => {
        if (moduleLiteral.text === "tscircuit/jsx-runtime") {
          const resolvedModule = resolveJsxRuntime()
          if (resolvedModule) {
            return { resolvedModule }
          }
        }

        const fallback = fallbackResolutions[index]
        if (fallback) {
          return fallback
        }

        const resolution = ts.resolveModuleName(
          moduleLiteral.text,
          containingFile,
          options ?? declarationCompilerOptions,
          compilerHost,
          moduleResolutionCache,
          redirectedReference,
        )

        return { resolvedModule: resolution.resolvedModule }
      })
    }

    const originalResolveModuleNames =
      compilerHost.resolveModuleNames?.bind(compilerHost)

    compilerHost.resolveModuleNames = (
      moduleNames,
      containingFile,
      reusedNames,
      redirectedReference,
      options,
      containingSourceFile,
    ) => {
      const fallbackResolutions = originalResolveModuleNames
        ? originalResolveModuleNames(
            moduleNames,
            containingFile,
            reusedNames,
            redirectedReference,
            options,
            containingSourceFile,
          )
        : []

      return moduleNames.map((moduleName, index) => {
        if (moduleName === "tscircuit/jsx-runtime") {
          const resolvedModule = resolveJsxRuntime()
          if (resolvedModule) {
            return resolvedModule
          }
        }

        const fallback = fallbackResolutions[index]
        if (fallback) {
          return fallback
        }

        const resolution = ts.resolveModuleName(
          moduleName,
          containingFile,
          options ?? declarationCompilerOptions,
          compilerHost,
          moduleResolutionCache,
          redirectedReference,
        )

        return resolution.resolvedModule
      })
    }

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

    for (const diagnostic of collectedDiagnostics) {
      if (diagnostic.code === 2875) {
        if (!ignoreWarnings) {
          const formattedMessage = formatDiagnosticMessage(
            ts,
            diagnostic,
            source,
            projectDir,
          )

          console.warn(
            kleur.yellow(
              `[transpile] ${formattedMessage} (emitting fallback JSX runtime types)`,
            ),
          )
        }

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
