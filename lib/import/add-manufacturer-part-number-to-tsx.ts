import ts from "typescript"

/** Populate the imported part's MPN from EasyEDA metadata, never its LCSC ID. */
export const addManufacturerPartNumberToTsx = (
  tsx: string,
  manufacturerPartNumber: string | undefined,
): string => {
  const mpn = manufacturerPartNumber?.trim()
  if (!mpn) return tsx

  const sourceFile = ts.createSourceFile(
    "imported.tsx",
    tsx,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let replacement: { start: number; end: number; text: string } | undefined
  const visit = (node: ts.Node): void => {
    if (replacement) return
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const partNumberAttribute = node.attributes.properties.find(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText(sourceFile) === "manufacturerPartNumber",
      )
      const propsSpread = node.attributes.properties.find(
        (attribute) =>
          ts.isJsxSpreadAttribute(attribute) &&
          ts.isIdentifier(attribute.expression) &&
          ["props", "restProps"].includes(attribute.expression.text),
      )
      if (
        partNumberAttribute &&
        propsSpread &&
        ts.isJsxSpreadAttribute(propsSpread)
      ) {
        const propsName = propsSpread.expression.getText(sourceFile)
        const partNumberExpression = `${propsName}.mpn ?? ${propsName}.manufacturerPartNumber ?? ${propsName}.mfn ?? ${JSON.stringify(mpn)}`
        replacement = {
          start: partNumberAttribute.getStart(sourceFile),
          end: partNumberAttribute.getEnd(),
          // Resolve both defaults alike so aliases agree, preserving the long name
          // for consumers still reading the existing prop.
          text: `mpn={${partNumberExpression}}\n      manufacturerPartNumber={${partNumberExpression}}`,
        }
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  if (!replacement) {
    throw new Error(
      "Could not find the imported component's manufacturer part number in TSX",
    )
  }
  return (
    tsx.slice(0, replacement.start) +
    replacement.text +
    tsx.slice(replacement.end)
  )
}
