import { parseKicadSexpr, KicadSch, LibSymbols, SchematicSymbol } from "kicadts"

const KICAD_SYM_LIB_VERSION = 20211014
const GENERATOR = "tsci"

export type SymbolEntry = {
  libraryName: string
  symbolName: string
  content: string
}

/**
 * Extract symbols from a KiCad schematic and return them formatted for a symbol library
 */
export const extractSymbolsFromSchematic = (
  schContent: string,
): SymbolEntry[] => {
  const uniqueSymbols = new Map<string, SymbolEntry>()

  try {
    const parsed = parseKicadSexpr(schContent)
    const sch = parsed.find(
      (node): node is KicadSch => node instanceof KicadSch,
    )
    if (!sch) return []

    const libSymbols = sch.libSymbols
    if (!libSymbols) return []

    const symbols = libSymbols.symbols ?? []
    for (const symbol of symbols) {
      const { libraryName, symbolName } = sanitizeLibraryAndSymbolName(
        symbol.libraryId,
      )
      const key = `${libraryName}::${symbolName}`
      if (!uniqueSymbols.has(key)) {
        // Get the symbol content and update the libraryId for standalone use
        const sanitizedSymbol = sanitizeSymbol(symbol, libraryName, symbolName)
        uniqueSymbols.set(key, {
          libraryName,
          symbolName,
          content: sanitizedSymbol.getString(),
        })
      }
    }
  } catch (error) {
    console.warn(
      "Failed to parse KiCad schematic content for symbol extraction:",
      error,
    )
  }

  return Array.from(uniqueSymbols.values())
}

const sanitizeLibraryAndSymbolName = (libraryId?: string) => {
  if (!libraryId) {
    return {
      libraryName: "tscircuit",
      symbolName: "symbol",
    }
  }

  if (!libraryId.includes(":")) {
    return {
      libraryName: "tscircuit",
      symbolName: libraryId.replace(/[\\\/]/g, "-") || "symbol",
    }
  }

  const [rawLibraryName, rawSymbolName] = libraryId.split(":", 2)
  const libraryName =
    rawLibraryName?.replace(/[\\\/]/g, "-").trim() || "tscircuit"
  const symbolName = rawSymbolName?.replace(/[\\\/]/g, "-").trim() || "symbol"

  return {
    libraryName,
    symbolName,
  }
}

const sanitizeSymbol = (
  symbol: SchematicSymbol,
  libraryName: string,
  symbolName: string,
): SchematicSymbol => {
  // Update the libraryId to use just the symbol name (for library format)
  symbol.libraryId = symbolName
  return symbol
}

/**
 * Generate a complete .kicad_sym library file from symbol entries
 */
export const generateSymbolLibrary = (
  symbols: SymbolEntry[],
  libraryName: string,
): string => {
  const lines: string[] = []

  lines.push("(kicad_symbol_lib")
  lines.push(`\t(version ${KICAD_SYM_LIB_VERSION})`)
  lines.push(`\t(generator "${GENERATOR}")`)

  for (const symbol of symbols) {
    // Indent each line of the symbol content
    const symbolLines = symbol.content.split("\n")
    for (const line of symbolLines) {
      lines.push(`\t${line}`)
    }
  }

  lines.push(")")

  return lines.join("\n")
}
