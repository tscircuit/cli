import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import { KicadFootprintToCircuitJsonConverter } from "kicad-to-circuit-json"
import kleur from "kleur"
import fs from "node:fs/promises"
import path from "node:path"

const KICAD_REFERENCE_TOKEN_SUFFIX = "__TSCIRCUIT_KICAD_REF__"

const unescapeKicadString = (raw: string) => raw.replace(/\\(["\\])/g, "$1")

const escapeKicadString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

const isDynamicReferenceVariable = (value: string) =>
  value === "${REFERENCE}" || value === "%R"

const tagKicadFootprintReferenceText = (modContent: string) => {
  let defaultReference = "REF**"
  const fpTextRefRegex = /(\(\s*fp_text\s+reference\s+)"((?:\\.|[^"\\])*)"/g
  const propRefRegex = /(\(\s*property\s+"Reference"\s+)"((?:\\.|[^"\\])*)"/g

  for (const match of modContent.matchAll(propRefRegex)) {
    const candidate = unescapeKicadString(match[2] ?? "").trim()
    if (candidate && !isDynamicReferenceVariable(candidate)) {
      defaultReference = candidate
      break
    }
  }

  if (defaultReference === "REF**") {
    for (const match of modContent.matchAll(fpTextRefRegex)) {
      const candidate = unescapeKicadString(match[2] ?? "").trim()
      if (candidate && !isDynamicReferenceVariable(candidate)) {
        defaultReference = candidate
        break
      }
    }
  }

  const prefix = defaultReference.match(/^[A-Za-z]+/)?.[0] ?? "REF"
  const sentinel = `${prefix}${KICAD_REFERENCE_TOKEN_SUFFIX}`
  const escapedSentinel = escapeKicadString(sentinel)

  const taggedModContent = modContent
    .replace(propRefRegex, `$1"${escapedSentinel}"`)
    .replace(fpTextRefRegex, `$1"${escapedSentinel}"`)
    .replace(
      /(\(\s*fp_text\s+\S+\s+)"((?:\\.|[^"\\])*)"/g,
      (fullMatch, openPrefix: string, rawText: string) => {
        if (!rawText.includes("${REFERENCE}") && !rawText.includes("%R")) {
          return fullMatch
        }
        const replaced = rawText
          .replaceAll("${REFERENCE}", escapedSentinel)
          .replaceAll("%R", escapedSentinel)
        return `${openPrefix}"${replaced}"`
      },
    )
    .replace(
      /(\(\s*property\s+"(?:\\.|[^"\\])*"\s+)"((?:\\.|[^"\\])*)"/g,
      (fullMatch, openPrefix: string, rawText: string) => {
        if (!rawText.includes("${REFERENCE}") && !rawText.includes("%R")) {
          return fullMatch
        }
        const replaced = rawText
          .replaceAll("${REFERENCE}", escapedSentinel)
          .replaceAll("%R", escapedSentinel)
        return `${openPrefix}"${replaced}"`
      },
    )

  return { taggedModContent, sentinel, defaultReference }
}

const restoreNonTextReferenceMetadata = (
  circuitJson: AnyCircuitElement[],
  sentinel: string,
  defaultReference: string,
) => {
  for (const element of circuitJson) {
    if (
      "name" in element &&
      typeof element.name === "string" &&
      element.name.includes(sentinel)
    ) {
      element.name = element.name.replaceAll(sentinel, defaultReference)
    }
  }
}

const bindReferencePlaceholdersInTsx = ({
  tsx,
  sentinel,
  defaultReference,
}: {
  tsx: string
  sentinel: string
  defaultReference: string
}) => {
  if (!tsx.includes("(props:")) return tsx
  const fallbackLiteral = JSON.stringify(defaultReference)
  const exactAttr = `text="${sentinel}"`
  let updated = tsx.replaceAll(
    exactAttr,
    `text={props.name ?? ${fallbackLiteral}}`,
  )
  if (updated.includes(sentinel)) {
    updated = updated.replace(
      /text="((?:\\.|[^"\\])*)"/g,
      (fullMatch, attrValue: string) => {
        if (!attrValue.includes(sentinel)) return fullMatch
        const parts = attrValue
          .split(sentinel)
          .map((part) =>
            part
              .replace(/\\"/g, '"')
              .replace(/\\/g, "\\\\")
              .replace(/`/g, "\\`")
              .replace(/\$\{/g, "\\${"),
          )
        return `text={\`${parts.join(`\${props.name ?? ${fallbackLiteral}}`)}\`}`
      },
    )
  }
  return updated
}

export const convertKicadFootprintToTsx = async ({
  inputPath,
  name,
  output,
}: {
  inputPath: string
  name?: string
  output?: string
}) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  const { taggedModContent, sentinel, defaultReference } =
    tagKicadFootprintReferenceText(modContent)

  const converter = new KicadFootprintToCircuitJsonConverter()
  converter.addFile(path.basename(inputPath), taggedModContent)
  converter.runUntilFinished()
  const circuitJson = converter.getOutput() as AnyCircuitElement[]
  restoreNonTextReferenceMetadata(circuitJson, sentinel, defaultReference)

  const componentName = name ?? path.basename(inputPath, ".kicad_mod")
  const rawTsx = convertCircuitJsonToTscircuit(circuitJson, { componentName })
  const tsx = bindReferencePlaceholdersInTsx({
    tsx: rawTsx,
    sentinel,
    defaultReference,
  })
  const outputPath = output
    ? path.resolve(output)
    : path.join(path.dirname(inputPath), `${componentName}.tsx`)

  await fs.writeFile(outputPath, tsx)
  console.log(kleur.green(`Converted ${outputPath}`))
}
