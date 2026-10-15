import type { ChipProps } from "@tscircuit/props"
import ts from "typescript"

/** Add datasheet defaults before the caller's props spread without evaluating source. */
export const addInternallyConnectedPinsToTsx = (
  source: string,
  groups: NonNullable<ChipProps["internallyConnectedPins"]>,
): string => {
  const file = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let component: ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined
  const visit = (node: ts.Node) => {
    if (component) return
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ["chip", "pushbutton", "jumper", "connector"].includes(
        node.tagName.getText(file),
      )
    )
      component = node
    else ts.forEachChild(node, visit)
  }
  visit(file)
  if (!component) return source
  const prop = `internallyConnectedPins={${JSON.stringify(groups).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026")}}`
  const previous = component.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText(file) === "internallyConnectedPins",
  )
  if (previous)
    return (
      source.slice(0, previous.getStart(file)) +
      prop +
      source.slice(previous.end)
    )
  const position =
    component.attributes.properties
      .find(ts.isJsxSpreadAttribute)
      ?.getStart(file) ?? component.attributes.end
  return (
    source.slice(0, position) +
    "\n      " +
    prop +
    "\n      " +
    source.slice(position)
  )
}
