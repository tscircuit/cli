const KICAD_REFERENCE_SENTINEL = "__TSCI_KICAD_REF_SENTINEL__"

type SexpToken = {
  start: number
  end: number
  rawToken: string
  decodedText: string
}

function skipWhitespace(sourceText: string, startIndex: number): number {
  let cursor = startIndex
  while (cursor < sourceText.length && /\s/.test(sourceText[cursor]!)) {
    cursor += 1
  }
  return cursor
}

function skipQuotedString(sourceText: string, quoteStartIndex: number): number {
  let cursor = quoteStartIndex + 1
  while (cursor < sourceText.length) {
    const ch = sourceText[cursor]
    if (ch === "\\") {
      cursor += 2
      continue
    }
    if (ch === '"') {
      return cursor + 1
    }
    cursor += 1
  }
  return sourceText.length
}

function decodeQuotedLiteral(rawToken: string): string {
  const inner = rawToken.slice(1, -1)
  let decoded = ""
  for (let index = 0; index < inner.length; index += 1) {
    const ch = inner[index]
    if (ch === "\\" && index + 1 < inner.length) {
      const nextChar = inner[index + 1]
      if (nextChar === "n") decoded += "\n"
      else if (nextChar === "r") decoded += "\r"
      else if (nextChar === "t") decoded += "\t"
      else decoded += nextChar
      index += 1
      continue
    }
    decoded += ch
  }
  return decoded
}

function encodeQuotedLiteral(textContent: string): string {
  const escaped = textContent
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
  return `"${escaped}"`
}

function readSexpToken(
  sourceText: string,
  startIndex: number,
): SexpToken | null {
  const cursor = skipWhitespace(sourceText, startIndex)
  if (cursor >= sourceText.length) return null
  const firstChar = sourceText[cursor]
  if (firstChar === "(" || firstChar === ")") return null
  if (firstChar === '"') {
    const end = skipQuotedString(sourceText, cursor)
    const rawToken = sourceText.slice(cursor, end)
    return {
      start: cursor,
      end,
      rawToken,
      decodedText: decodeQuotedLiteral(rawToken),
    }
  }
  let end = cursor
  while (end < sourceText.length && !/[\s()"']/.test(sourceText[end]!)) {
    end += 1
  }
  if (end === cursor) return null
  const rawToken = sourceText.slice(cursor, end)
  return {
    start: cursor,
    end,
    rawToken,
    decodedText: rawToken,
  }
}

function formatTextTokenReplacement({
  rawToken,
  isReferenceField,
}: {
  rawToken: string
  isReferenceField: boolean
}): string | null {
  if (isReferenceField) {
    return encodeQuotedLiteral(KICAD_REFERENCE_SENTINEL)
  }
  const decodedText = rawToken.startsWith('"')
    ? decodeQuotedLiteral(rawToken)
    : rawToken
  const updatedText = decodedText
    .replace(/\$\{REFERENCE\}/g, KICAD_REFERENCE_SENTINEL)
    .replace(/%R/g, KICAD_REFERENCE_SENTINEL)
  if (updatedText === decodedText) {
    return null
  }
  return encodeQuotedLiteral(updatedText)
}

export function injectKicadFootprintReferenceSentinel(
  modContent: string,
): string {
  const outputParts: string[] = []
  let lastCopiedIndex = 0
  let cursor = 0

  while (cursor < modContent.length) {
    const ch = modContent[cursor]
    if (ch === '"') {
      cursor = skipQuotedString(modContent, cursor)
      continue
    }
    if (ch === "(") {
      const headToken = readSexpToken(modContent, cursor + 1)
      if (
        headToken &&
        (headToken.decodedText === "fp_text" ||
          headToken.decodedText === "property")
      ) {
        const secondToken = readSexpToken(modContent, headToken.end)
        const thirdToken = secondToken
          ? readSexpToken(modContent, secondToken.end)
          : null
        if (secondToken && thirdToken) {
          const isReferenceField =
            headToken.decodedText === "fp_text"
              ? secondToken.decodedText === "reference"
              : secondToken.decodedText === "Reference"
          const replacementToken = formatTextTokenReplacement({
            rawToken: thirdToken.rawToken,
            isReferenceField,
          })
          if (replacementToken !== null) {
            outputParts.push(
              modContent.slice(lastCopiedIndex, thirdToken.start),
              replacementToken,
            )
            lastCopiedIndex = thirdToken.end
            cursor = thirdToken.end
            continue
          }
        }
      }
    }
    cursor += 1
  }

  outputParts.push(modContent.slice(lastCopiedIndex))
  return outputParts.join("")
}

function formatJsxTextAttribute(literalBody: string): string {
  if (literalBody === KICAD_REFERENCE_SENTINEL) {
    return "text={props.name}"
  }
  const segments = literalBody
    .split(KICAD_REFERENCE_SENTINEL)
    .map((segment) =>
      segment
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${"),
    )
  return `text={\`${segments.join("${props.name}")}\`}`
}

export function replaceReferenceSentinelInGeneratedTsx(
  generatedTsx: string,
): string {
  return generatedTsx
    .replace(
      /\btext=\{("|')((?:\\.|(?!\1)[^\\])*__TSCI_KICAD_REF_SENTINEL__(?:\\.|(?!\1)[^\\])*)\1\}/g,
      (_match, _quote, literalBody: string) =>
        formatJsxTextAttribute(literalBody),
    )
    .replace(
      /\btext=(["'])((?:\\.|(?!\1)[^\\])*__TSCI_KICAD_REF_SENTINEL__(?:\\.|(?!\1)[^\\])*)\1/g,
      (_match, _quote, literalBody: string) =>
        formatJsxTextAttribute(literalBody),
    )
}
