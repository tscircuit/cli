import ts from "typescript"

// Inspect generated source without executing API-provided code. Props supplied
// through spreads or expressions cannot be determined statically.
export const hasChipWithoutCadModel = (source: string): boolean => {
  const file = ts.createSourceFile(
    "import.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let missing = false
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(file) === "chip"
    ) {
      const cadModel = node.attributes.properties.find(
        (prop): prop is ts.JsxAttribute =>
          ts.isJsxAttribute(prop) && prop.name.getText(file) === "cadModel",
      )
      const initializer = cadModel?.initializer
      const expression =
        initializer && ts.isJsxExpression(initializer)
          ? initializer.expression
          : undefined
      const emptyString =
        (initializer &&
          ts.isStringLiteral(initializer) &&
          !initializer.text.trim()) ||
        (expression &&
          ts.isStringLiteral(expression) &&
          !expression.text.trim())
      const explicitlyEmpty =
        expression &&
        (expression.kind === ts.SyntaxKind.NullKeyword ||
          expression.kind === ts.SyntaxKind.FalseKeyword ||
          (ts.isIdentifier(expression) && expression.text === "undefined") ||
          (ts.isObjectLiteralExpression(expression) &&
            expression.properties.length === 0))
      const hasSpread = node.attributes.properties.some(ts.isJsxSpreadAttribute)
      if (!hasSpread && (!initializer || explicitlyEmpty || emptyString))
        missing = true
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return missing
}
