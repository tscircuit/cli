import type { CommonComponentProps } from "@tscircuit/props"
import ts from "typescript"

const unwrap = (expression: ts.Expression): ts.Expression =>
  ts.isAsExpression(expression) ||
  ts.isSatisfiesExpression(expression) ||
  ts.isParenthesizedExpression(expression)
    ? unwrap(expression.expression)
    : expression

/** Update EasyEDA's generated literal without evaluating downloaded code. */
export const addPinAttributesToTsx = (
  tsx: string,
  attributes: NonNullable<CommonComponentProps["pinAttributes"]>,
): string => {
  if (Object.keys(attributes).length === 0) return tsx
  const source = ts.createSourceFile(
    "component.tsx",
    tsx,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let chip: ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined
  const declarations = new Map<string, ts.Expression>()
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    )
      declarations.set(node.name.text, node.initializer)
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(source) === "chip"
    )
      chip ??= node
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!chip) return tsx

  const attribute = chip.attributes.properties.find(
    (p): p is ts.JsxAttribute =>
      ts.isJsxAttribute(p) && p.name.getText(source) === "pinAttributes",
  )
  const initializer = attribute?.initializer
  let existing =
    initializer && ts.isJsxExpression(initializer)
      ? initializer.expression
      : undefined
  if (existing && ts.isIdentifier(existing)) {
    existing = declarations.get(existing.text)
  }
  const literal = existing ? unwrap(existing) : undefined
  // The converter emits a literal, optionally referenced by a const. Do not
  // rewrite arbitrary expressions if a future converter changes this contract.
  if (attribute && (!literal || !ts.isObjectLiteralExpression(literal))) {
    throw new Error("Unsupported generated pinAttributes expression")
  }

  const incoming = new Map(Object.entries(attributes))
  const properties: string[] = []
  if (literal && ts.isObjectLiteralExpression(literal)) {
    for (const property of literal.properties) {
      const name = property.name
      const key =
        name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
          ? name.text
          : undefined
      const additional = key ? incoming.get(key) : undefined
      if (key && additional && ts.isPropertyAssignment(property)) {
        properties.push(
          `${JSON.stringify(key)}: { ...${property.initializer.getText(source)}, ...${JSON.stringify(additional)} }`,
        )
        incoming.delete(key)
      } else {
        properties.push(property.getText(source))
      }
    }
  }
  for (const [key, value] of incoming) {
    properties.push(`${JSON.stringify(key)}: ${JSON.stringify(value)}`)
  }
  const replacement = `{\n${properties.map((p) => `  ${p}`).join(",\n")}\n}`
  if (literal) {
    return (
      tsx.slice(0, literal.getStart(source)) +
      replacement +
      tsx.slice(literal.end)
    )
  }
  // Keep the caller's props spread last so explicit user overrides still work.
  const spread = chip.attributes.properties.find(ts.isJsxSpreadAttribute)
  const position = spread?.getStart(source) ?? chip.attributes.end
  return (
    tsx.slice(0, position) +
    `\n      pinAttributes={${replacement}}\n      ` +
    tsx.slice(position)
  )
}
