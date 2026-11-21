import {
  glyphAdvanceRatio,
  glyphLineAlphabet,
  spaceWidthRatio,
} from "@tscircuit/alphabet"

type GlyphLine = { x1: number; y1: number; x2: number; y2: number }

/** Glyphs the bundled stroke alphabet lacks. Round line caps draw these as dots. */
const EXTRA_GLYPHS: Record<string, { advance: number; lines: GlyphLine[] }> = {
  ":": {
    advance: 0.4,
    lines: [
      { x1: 0.2, y1: 0.25, x2: 0.2, y2: 0.26 },
      { x1: 0.2, y1: 0.7, x2: 0.2, y2: 0.71 },
    ],
  },
}

const getGlyph = (character: string) => {
  const extraGlyph = EXTRA_GLYPHS[character]
  if (extraGlyph) return extraGlyph
  const lines: GlyphLine[] | undefined = glyphLineAlphabet[character]
  if (character !== " " && !lines) {
    return {
      advance: glyphAdvanceRatio["?"] ?? spaceWidthRatio,
      lines: (glyphLineAlphabet["?"] ?? []) as GlyphLine[],
    }
  }
  return {
    advance: glyphAdvanceRatio[character] ?? spaceWidthRatio,
    lines: lines ?? [],
  }
}

/** Text width in multiples of the font size. */
export const getStrokeTextAdvance = (text: string) =>
  [...text].reduce((sum, character) => sum + getGlyph(character).advance, 0)

/**
 * SVG path data for text drawn with the bundled stroke alphabet, so rendered
 * text does not depend on system fonts.
 */
export const getStrokeTextSvgPath = ({
  text,
  x,
  baselineY,
  size,
}: {
  text: string
  x: number
  baselineY: number
  size: number
}) => {
  const segments: string[] = []
  for (const character of text) {
    const glyph = getGlyph(character)
    for (const line of glyph.lines) {
      segments.push(
        `M ${x + line.x1 * size} ${baselineY - line.y1 * size} L ${x + line.x2 * size} ${baselineY - line.y2 * size}`,
      )
    }
    x += glyph.advance * size
  }
  return segments.join(" ")
}
