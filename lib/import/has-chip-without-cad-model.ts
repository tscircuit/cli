import ts from "typescript"

// Inspect generated source without executing API-provided code. Props supplied
// through spreads or expressions cannot be determined statically.
// Generated imports often forward their component props. An expression-bodied
// arrow parameter without a default does not provide an included model. Other
// spreads remain unknown (they could refer to an imported/default model).
const isForwardedProps = (spread: ts.JsxSpreadAttribute): boolean => {
  if (!ts.isIdentifier(spread.expression)) return false
  const name = spread.expression.text
  let ancestor: ts.Node | undefined = spread.parent
  while (ancestor && !ts.isArrowFunction(ancestor)) ancestor = ancestor.parent
  if (!ancestor || !ts.isArrowFunction(ancestor) || ts.isBlock(ancestor.body)) {
    return false
  }
  return ancestor.parameters.some(
    (parameter) =>
      ts.isIdentifier(parameter.name) &&
      parameter.name.text === name &&
      !parameter.initializer,
  )
}

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
      const hasSpread = node.attributes.properties.some(
        (prop) => ts.isJsxSpreadAttribute(prop) && !isForwardedProps(prop),
      )
      if (!hasSpread && (!initializer || explicitlyEmpty || emptyString))
        missing = true
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return missing
}
