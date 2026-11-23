import type { AnyCircuitElement } from "circuit-json"

interface SExprAtom {
  kind: "atom"
  value: string
  quoted: boolean
  start: number
  end: number
}

interface SExprList {
  kind: "list"
  items: SExprNode[]
  start: number
  end: number
}

type SExprNode = SExprAtom | SExprList

type PcbTextElement = Extract<
  AnyCircuitElement,
  {
    type:
      | "pcb_silkscreen_text"
      | "pcb_fabrication_note_text"
      | "pcb_copper_text"
  }
>

const REFERENCE_SENTINEL_BASE = "__TSCIRCUIT_KICAD_REF_PLACEHOLDER__"

function parseKicadSExpr(source: string): SExprNode[] {
  const roots: SExprNode[] = []
  const stack: SExprList[] = []
  let i = 0
  const len = source.length

  const pushNode = (node: SExprNode) => {
    const parent = stack[stack.length - 1]
    if (parent) {
      parent.items.push(node)
    } else {
      roots.push(node)
    }
  }

  while (i < len) {
    const ch = source[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === ";") {
      while (i < len && source[i] !== "\n") i++
      continue
    }
    if (ch === "(") {
      const list: SExprList = { kind: "list", items: [], start: i, end: i }
      pushNode(list)
      stack.push(list)
      i++
      continue
    }
    if (ch === ")") {
      const closed = stack.pop()
      if (closed) closed.end = i + 1
      i++
      continue
    }
    if (ch === '"') {
      const start = i
      i++
      let value = ""
      while (i < len) {
        const c = source[i]!
        if (c === "\\" && i + 1 < len) {
          const next = source[i + 1]!
          if (next === "n") value += "\n"
          else if (next === "r") value += "\r"
          else if (next === "t") value += "\t"
          else value += next
          i += 2
          continue
        }
        if (c === '"') {
          i++
          break
        }
        value += c
        i++
      }
      pushNode({ kind: "atom", value, quoted: true, start, end: i })
      continue
    }
    const start = i
    while (i < len && !/[\s()"]/.test(source[i]!)) i++
    pushNode({
      kind: "atom",
      value: source.slice(start, i),
      quoted: false,
      start,
      end: i,
    })
  }

  return roots
}

function encodeKicadString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")}"`
}

function replaceKicadReferenceVariables(
  text: string,
  sentinel: string,
): string {
  let out = ""
  let i = 0
  while (i < text.length) {
    if (text.startsWith("${REFERENCE}", i)) {
      out += sentinel
      i += "${REFERENCE}".length
      continue
    }
    if (text[i] === "%" && i + 1 < text.length) {
      const next = text[i + 1]!
      if (next === "%") {
        out += "%%"
        i += 2
        continue
      }
      if (next === "R") {
        out += sentinel
        i += 2
        continue
      }
    }
    out += text[i]!
    i++
  }
  return out
}

export function createReferenceTemplatedKicadMod(modContent: string): {
  content: string
  sentinel: string
  hasPlaceholders: boolean
} {
  let sentinel = REFERENCE_SENTINEL_BASE
  while (modContent.includes(sentinel)) {
    sentinel += "_"
  }

  const roots = parseKicadSExpr(modContent)
  const footprintNode = roots.find(
    (node): node is SExprList =>
      node.kind === "list" &&
      node.items[0]?.kind === "atom" &&
      (node.items[0].value === "footprint" || node.items[0].value === "module"),
  )

  if (!footprintNode) {
    return { content: modContent, sentinel, hasPlaceholders: false }
  }

  const replacements: Array<{ start: number; end: number; text: string }> = []

  for (const child of footprintNode.items.slice(1)) {
    if (child.kind !== "list" || child.items.length < 3) continue
    const head = child.items[0]
    const kindOrKey = child.items[1]
    const valueNode = child.items[2]
    if (
      head?.kind !== "atom" ||
      kindOrKey?.kind !== "atom" ||
      valueNode?.kind !== "atom"
    ) {
      continue
    }

    const isReferenceField =
      (head.value === "fp_text" && kindOrKey.value === "reference") ||
      (head.value === "property" && kindOrKey.value === "Reference")

    if (isReferenceField) {
      replacements.push({
        start: valueNode.start,
        end: valueNode.end,
        text: encodeKicadString(sentinel),
      })
      continue
    }

    if (head.value === "fp_text" || head.value === "property") {
      const rewritten = replaceKicadReferenceVariables(
        valueNode.value,
        sentinel,
      )
      if (rewritten !== valueNode.value) {
        replacements.push({
          start: valueNode.start,
          end: valueNode.end,
          text: encodeKicadString(rewritten),
        })
      }
    }
  }

  if (replacements.length === 0) {
    return { content: modContent, sentinel, hasPlaceholders: false }
  }

  let content = modContent
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    content =
      content.slice(0, replacement.start) +
      replacement.text +
      content.slice(replacement.end)
  }

  return { content, sentinel, hasPlaceholders: true }
}

function isPcbTextElement(el: AnyCircuitElement): el is PcbTextElement {
  return (
    el.type === "pcb_silkscreen_text" ||
    el.type === "pcb_fabrication_note_text" ||
    el.type === "pcb_copper_text"
  )
}

function textGeometryMatches(a: PcbTextElement, b: PcbTextElement): boolean {
  if (a.type !== b.type) return false
  if (a.layer !== b.layer) return false
  const ax = a.anchor_position?.x ?? 0
  const ay = a.anchor_position?.y ?? 0
  const bx = b.anchor_position?.x ?? 0
  const by = b.anchor_position?.y ?? 0
  if (Math.abs(ax - bx) > 1e-6 || Math.abs(ay - by) > 1e-6) return false
  if (Math.abs((a.font_size ?? 0) - (b.font_size ?? 0)) > 1e-6) return false
  if (Math.abs((a.ccw_rotation ?? 0) - (b.ccw_rotation ?? 0)) > 1e-6) {
    return false
  }
  return true
}

export function mergeReferenceTextTemplates(
  originalCircuitJson: AnyCircuitElement[],
  templatedCircuitJson: AnyCircuitElement[],
  sentinel: string,
): AnyCircuitElement[] {
  const templatedTexts = templatedCircuitJson.filter(isPcbTextElement)
  const usedTemplatedIndices = new Set<number>()

  return originalCircuitJson.map((element) => {
    if (!isPcbTextElement(element)) return element
    const matchIndex = templatedTexts.findIndex(
      (candidate, index) =>
        !usedTemplatedIndices.has(index) &&
        textGeometryMatches(element, candidate),
    )
    if (matchIndex === -1) return element
    usedTemplatedIndices.add(matchIndex)
    const matched = templatedTexts[matchIndex]!
    if (!matched.text.includes(sentinel)) return element
    return {
      ...element,
      text: matched.text,
    }
  })
}

function escapeTemplateLiteralChunk(chunk: string): string {
  return chunk
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")
}

export function replaceReferenceSentinelInTsx(
  tsx: string,
  sentinel: string,
): string {
  if (!tsx.includes(sentinel)) return tsx

  return tsx.replace(
    /text="((?:\\.|[^"\\])*)"/g,
    (fullMatch, rawAttrValue: string) => {
      if (!rawAttrValue.includes(sentinel)) return fullMatch
      const decoded = rawAttrValue.replace(/\\"/g, '"')
      if (decoded === sentinel) {
        return "text={props.name}"
      }
      const parts = decoded.split(sentinel)
      const templateBody = parts
        .map((part) => escapeTemplateLiteralChunk(part))
        .join("${props.name}")
      return `text={\`${templateBody}\`}`
    },
  )
}
