import { strokeWidthRatio } from "@tscircuit/alphabet"
import { Resvg } from "@resvg/resvg-js"
import {
  getStrokeTextAdvance,
  getStrokeTextSvgPath,
} from "./stroke-text-svg-path"

export const EXPLOSION_CAPTION_HEIGHT = 40

/** Use the bundled stroke alphabet so captions do not depend on system fonts. */
export const createExplosionVideoCaption = (label: string, width: number) => {
  const size = Math.min(
    18,
    (width - 24) / Math.max(getStrokeTextAdvance(label), 1),
  )
  const path = getStrokeTextSvgPath({
    text: label,
    x: 12,
    baselineY: 29,
    size,
  })
  return new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${EXPLOSION_CAPTION_HEIGHT}"><rect width="100%" height="100%" fill="#f1f5f9"/><path d="${path}" stroke="#20344d" stroke-width="${size * strokeWidthRatio}" stroke-linecap="round"/></svg>`,
  ).render().pixels
}
