import {
  glyphAdvanceRatio,
  glyphLineAlphabet,
  spaceWidthRatio,
  strokeWidthRatio,
} from "@tscircuit/alphabet"
import { Resvg } from "@resvg/resvg-js"

export const EXPLOSION_CAPTION_HEIGHT = 40

/** Use the bundled stroke alphabet so captions do not depend on system fonts. */
export const createExplosionVideoCaption = (label: string, width: number) => {
  const characters = [...label].map((c) =>
    c === " " || glyphLineAlphabet[c] ? c : "?",
  )
  const advance = characters.reduce(
    (sum, c) => sum + (glyphAdvanceRatio[c] ?? spaceWidthRatio),
    0,
  )
  const size = Math.min(18, (width - 24) / Math.max(advance, 1))
  let x = 12
  const lines: string[] = []
  for (const character of characters) {
    for (const stroke of glyphLineAlphabet[character] ?? []) {
      lines.push(
        `M ${x + stroke.x1 * size} ${29 - stroke.y1 * size} L ${x + stroke.x2 * size} ${29 - stroke.y2 * size}`,
      )
    }
    x += (glyphAdvanceRatio[character] ?? spaceWidthRatio) * size
  }
  return new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${EXPLOSION_CAPTION_HEIGHT}"><rect width="100%" height="100%" fill="#f1f5f9"/><path d="${lines.join(" ")}" stroke="#20344d" stroke-width="${size * strokeWidthRatio}" stroke-linecap="round"/></svg>`,
  ).render().pixels
}
