export type SymbolEntry = {
  libraryName: string
  symbolName: string
  content: string
}

export const extractSymbolsFromSchematic = (
  schContent: string,
): SymbolEntry[] => {
  const symbols: SymbolEntry[] = []

  try {
    // Find the lib_symbols section
    const libSymbolsStart = schContent.indexOf("(lib_symbols")
    if (libSymbolsStart === -1) return []

    // Find where lib_symbols ends (before sheet_instances or next major section)
    const sheetInstancesPos = schContent.indexOf("(sheet_instances")
    const libSymbolsEnd =
      sheetInstancesPos !== -1 ? sheetInstancesPos : schContent.length
    const libSymbolsContent = schContent.slice(libSymbolsStart, libSymbolsEnd)

    // Extract individual symbols - find each (symbol "..." that's a direct child
    // We need to match balanced parentheses
    let pos = 0
    while (pos < libSymbolsContent.length) {
      const symbolStart = libSymbolsContent.indexOf('(symbol "', pos)
      if (symbolStart === -1) break

      // Extract the symbol name
      const nameStart = symbolStart + 9 // length of '(symbol "'
      const nameEnd = libSymbolsContent.indexOf('"', nameStart)
      if (nameEnd === -1) break

      const fullName = libSymbolsContent.slice(nameStart, nameEnd)

      // Find the matching closing paren by counting parens
      let depth = 1
      let i = nameEnd + 1
      while (i < libSymbolsContent.length && depth > 0) {
        if (libSymbolsContent[i] === "(") depth++
        else if (libSymbolsContent[i] === ")") depth--
        i++
      }

      const symbolContent = libSymbolsContent.slice(symbolStart, i)

      // Parse library:symbol name
      const [libraryName, symbolName] = fullName.includes(":")
        ? fullName.split(":", 2)
        : ["tscircuit", fullName]

      symbols.push({
        libraryName: libraryName.replace(/[\\\/]/g, "-").trim() || "tscircuit",
        symbolName: symbolName?.replace(/[\\\/]/g, "-").trim() || "symbol",
        content: symbolContent,
      })

      pos = i
    }
  } catch (error) {
    console.warn(
      "Failed to parse KiCad schematic content for symbol extraction:",
      error,
    )
  }

  return symbols
}

export const generateKicadSymbolLibrary = (
  symbols: SymbolEntry[],
  libraryName: string = "tscircuit",
): string => {
  if (symbols.length === 0) return ""

  const symbolContents = symbols
    .map((s) => {
      // Replace the original library name with our library name in the symbol definition
      return s.content.replace(
        /\(symbol\s+"[^"]+"/,
        `(symbol "${libraryName}:${s.symbolName}"`,
      )
    })
    .join("\n  ")

  return `(kicad_symbol_lib
  (version 20241209)
  (generator "tsci")
  (generator_version "1.0")
  ${symbolContents}
)
`
}
